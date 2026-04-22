import type { ResumeAnalysis } from "@workspace/api-zod";

export function renderReportText(
  a: ResumeAnalysis,
  fileName: string,
): string {
  const lines: string[] = [];
  lines.push("ResumeLens — Resume Analysis Report");
  lines.push("====================================");
  lines.push("");
  lines.push(`File: ${fileName}`);
  lines.push(`Role evaluated: ${a.roleEvaluated}`);
  lines.push(`Overall score: ${a.score}/100`);
  lines.push(`ATS-friendliness score: ${a.atsScore}/100`);
  lines.push("");
  lines.push(`Verdict: ${a.verdict}`);
  lines.push("");
  lines.push("Summary");
  lines.push("-------");
  lines.push(a.summary);
  lines.push("");
  lines.push("ATS Feedback");
  lines.push("------------");
  lines.push(a.atsFeedback);
  lines.push("");
  lines.push("Strengths");
  lines.push("---------");
  for (const s of a.strengths) lines.push(`- ${s.title}: ${s.detail}`);
  lines.push("");
  lines.push("Missing");
  lines.push("-------");
  for (const s of a.missing) lines.push(`- ${s.title}: ${s.detail}`);
  lines.push("");
  lines.push("Improvements");
  lines.push("------------");
  for (const s of a.improvements) lines.push(`- ${s.title}: ${s.detail}`);
  lines.push("");
  lines.push("Suggested keywords");
  lines.push("------------------");
  lines.push(a.keywordSuggestions.join(", "));
  lines.push("");
  lines.push("Final recommendation");
  lines.push("--------------------");
  lines.push(a.finalRecommendation);
  return lines.join("\n");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#ca8a04";
  return "#dc2626";
}

function listSection(
  title: string,
  items: ResumeAnalysis["strengths"],
): string {
  if (!items.length) return "";
  const lis = items
    .map(
      (i) =>
        `<li style="margin:0 0 10px 0;"><strong style="color:#0f172a;">${esc(
          i.title,
        )}.</strong> <span style="color:#334155;">${esc(i.detail)}</span></li>`,
    )
    .join("");
  return `
    <h2 style="font-size:16px;color:#0f172a;margin:28px 0 10px 0;">${esc(title)}</h2>
    <ul style="padding-left:20px;margin:0;color:#334155;font-size:14px;line-height:1.6;">${lis}</ul>
  `;
}

export function renderReportHtml(
  a: ResumeAnalysis,
  fileName: string,
): string {
  const keywords = a.keywordSuggestions
    .map(
      (k) =>
        `<span style="display:inline-block;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:9999px;padding:4px 10px;margin:0 6px 6px 0;font-size:12px;">${esc(
          k,
        )}</span>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">ResumeLens</div>
          <div style="font-size:22px;font-weight:700;margin-top:6px;">Your resume analysis report</div>
          <div style="font-size:13px;opacity:0.9;margin-top:6px;">${esc(fileName)} • Role: ${esc(a.roleEvaluated)}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top" style="padding-right:12px;">
                <div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;text-align:center;">
                  <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Overall score</div>
                  <div style="font-size:36px;font-weight:700;color:${scoreColor(a.score)};margin-top:4px;">${a.score}<span style="font-size:16px;color:#94a3b8;">/100</span></div>
                </div>
              </td>
              <td valign="top" style="padding-left:12px;">
                <div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;text-align:center;">
                  <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">ATS-friendly</div>
                  <div style="font-size:36px;font-weight:700;color:${scoreColor(a.atsScore)};margin-top:4px;">${a.atsScore}<span style="font-size:16px;color:#94a3b8;">/100</span></div>
                </div>
              </td>
            </tr>
          </table>
          <p style="margin:22px 0 0 0;font-size:15px;color:#0f172a;font-weight:600;">${esc(a.verdict)}</p>
          <p style="margin:8px 0 0 0;font-size:14px;color:#475569;line-height:1.6;">${esc(a.summary)}</p>

          <h2 style="font-size:16px;color:#0f172a;margin:28px 0 10px 0;">ATS feedback</h2>
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${esc(a.atsFeedback)}</p>

          ${listSection("Strengths", a.strengths)}
          ${listSection("Missing skills & sections", a.missing)}
          ${listSection("Improvement suggestions", a.improvements)}

          <h2 style="font-size:16px;color:#0f172a;margin:28px 0 10px 0;">Suggested keywords</h2>
          <div>${keywords}</div>

          <h2 style="font-size:16px;color:#0f172a;margin:28px 0 10px 0;">Final recommendation</h2>
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${esc(a.finalRecommendation)}</p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 0 0;" />
          <p style="font-size:12px;color:#94a3b8;margin:14px 0 0 0;">Generated by ResumeLens • Powered by AI</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
