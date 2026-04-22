import { Router, type IRouter } from "express";
import { AnalyzeResumeBody, type ResumeAnalysis } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import pdfParse from "pdf-parse";
import { sendReportEmail } from "../lib/email";
import { renderReportHtml, renderReportText } from "../lib/reportTemplate";

const router: IRouter = Router();

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_RESUME_CHARS = 30_000;

const analysisSchema = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    verdict: { type: "string" },
    summary: { type: "string" },
    roleEvaluated: { type: "string" },
    atsScore: { type: "integer", minimum: 0, maximum: 100 },
    atsFeedback: { type: "string" },
    strengths: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    missing: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    improvements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    keywordSuggestions: {
      type: "array",
      items: { type: "string" },
    },
    finalRecommendation: { type: "string" },
  },
  required: [
    "score",
    "verdict",
    "summary",
    "roleEvaluated",
    "atsScore",
    "atsFeedback",
    "strengths",
    "missing",
    "improvements",
    "keywordSuggestions",
    "finalRecommendation",
  ],
} as const;

router.post("/resume/analyze", async (req, res) => {
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.issues,
    });
  }

  const { fileName, pdfBase64, role, email } = parsed.data;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = Buffer.from(pdfBase64, "base64");
  } catch {
    return res.status(400).json({ error: "pdfBase64 is not valid base64" });
  }

  if (pdfBuffer.length === 0) {
    return res.status(400).json({ error: "Uploaded PDF is empty" });
  }
  if (pdfBuffer.length > MAX_PDF_BYTES) {
    return res
      .status(413)
      .json({ error: "PDF is too large. Maximum size is 10 MB." });
  }

  let resumeText: string;
  try {
    const parsedPdf = await pdfParse(pdfBuffer);
    resumeText = (parsedPdf.text ?? "").trim();
  } catch (err) {
    req.log.error({ err }, "Failed to parse PDF");
    return res.status(400).json({
      error: "Could not read the PDF. Please upload a valid PDF resume.",
    });
  }

  if (resumeText.length < 50) {
    return res.status(400).json({
      error:
        "We couldn't extract meaningful text from your PDF. If your resume is image-based, please export it as a text PDF and try again.",
    });
  }

  const trimmedResume =
    resumeText.length > MAX_RESUME_CHARS
      ? resumeText.slice(0, MAX_RESUME_CHARS)
      : resumeText;

  const trimmedRole = role.trim();
  const evaluatedRole = trimmedRole.length > 0 ? trimmedRole : "General";

  const prompt = buildPrompt(evaluatedRole, trimmedResume);

  let analysis: ResumeAnalysis;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        maxOutputTokens: 8192,
        temperature: 0.4,
      },
    });
    const text = response.text ?? "";
    analysis = JSON.parse(text) as ResumeAnalysis;
  } catch (err) {
    req.log.error({ err }, "Gemini analysis failed");
    return res
      .status(502)
      .json({ error: "AI analysis failed. Please try again in a moment." });
  }

  analysis = clampAnalysis(analysis, evaluatedRole);

  const subject = `Your ResumeLens report — Score ${analysis.score}/100${
    evaluatedRole === "General" ? "" : ` for ${evaluatedRole}`
  }`;

  let emailSent = false;
  let emailMessage =
    "We couldn't send the email report. Please try again later.";
  try {
    await sendReportEmail({
      to: email,
      subject,
      html: renderReportHtml(analysis, fileName),
      text: renderReportText(analysis, fileName),
    });
    emailSent = true;
    emailMessage = `Your detailed resume report has been sent to ${email} successfully.`;
  } catch (err) {
    req.log.error({ err }, "Failed to send email report");
    if (err instanceof Error && err.message) {
      emailMessage = `We analyzed your resume, but couldn't send the email: ${err.message}`;
    }
  }

  return res.json({ analysis, emailSent, emailMessage });
});

function buildPrompt(role: string, resumeText: string): string {
  const roleInstruction =
    role === "General"
      ? "No specific role was provided. Evaluate the resume using general best practices for modern professional resumes."
      : `Evaluate the resume specifically for the role: ${role}. Score and feedback should reflect how well-suited this resume is for that role.`;

  return [
    "You are an expert career coach and senior technical recruiter who reviews resumes for hiring managers.",
    roleInstruction,
    "Provide an honest, constructive, and specific evaluation. Avoid generic advice.",
    "",
    "Return JSON matching this exact schema:",
    "- score: integer 0-100 (overall resume quality for the target role)",
    "- verdict: a single short sentence (max ~120 chars) summarizing the resume's standing",
    "- summary: 2-4 sentence paragraph explaining the score",
    "- roleEvaluated: the role you evaluated against (use the exact role provided, or 'General')",
    "- atsScore: integer 0-100 indicating ATS-friendliness",
    "- atsFeedback: 1-3 sentences with specific ATS issues or wins (formatting, parseability, keyword density, section headings, fonts/columns/tables)",
    "- strengths: 3-5 items, each { title, detail }",
    "- missing: 3-6 items, each { title, detail } — missing skills, sections, or important content",
    "- improvements: 4-7 items, each { title, detail } — concrete actions to improve content, structure, and keywords",
    "- keywordSuggestions: 6-12 specific keywords/skills the candidate should add or emphasize",
    "- finalRecommendation: 2-4 sentence closing recommendation summarizing next steps",
    "",
    "RESUME (extracted text):",
    "----- BEGIN RESUME -----",
    resumeText,
    "----- END RESUME -----",
  ].join("\n");
}

function clampAnalysis(
  a: ResumeAnalysis,
  evaluatedRole: string,
): ResumeAnalysis {
  return {
    ...a,
    score: clampInt(a.score, 0, 100),
    atsScore: clampInt(a.atsScore, 0, 100),
    roleEvaluated: a.roleEvaluated || evaluatedRole,
    strengths: a.strengths ?? [],
    missing: a.missing ?? [],
    improvements: a.improvements ?? [],
    keywordSuggestions: a.keywordSuggestions ?? [],
  };
}

function clampInt(n: number, min: number, max: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default router;
