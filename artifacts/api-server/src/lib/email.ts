// Sends transactional email reports through Resend.

interface SendReportEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "ResumeLens <onboarding@resend.dev>";

export async function sendReportEmail(args: SendReportEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Add it as a secret to enable email delivery.",
    );
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    let message = `Email service responded with ${resp.status}`;
    try {
      const parsed = JSON.parse(detail) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (detail) message = detail.slice(0, 200);
    }
    throw new Error(message);
  }
}

export type { SendReportEmailArgs };
