// Sends transactional email reports through the connected Gmail account.
// Uses Replit's connector token to call the Gmail REST API directly so we
// don't have to bundle the heavy googleapis package.

interface SendReportEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface ConnectorToken {
  access_token: string;
}

interface ConnectorItem {
  settings?: {
    access_token?: string;
    oauth?: { credentials?: { access_token?: string } };
  };
}

let cached: { token: string; expiresAt: number } | null = null;

async function getGmailAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken =
    process.env.REPL_IDENTITY
      ? `repl ${process.env.REPL_IDENTITY}`
      : process.env.WEB_REPL_RENEWAL
        ? `depl ${process.env.WEB_REPL_RENEWAL}`
        : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Gmail is not connected. Connect your Gmail account in the integrations panel.",
    );
  }

  const url = `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=google-mail`;
  const resp = await fetch(url, {
    headers: {
      Accept: "application/json",
      X_REPLIT_TOKEN: xReplitToken,
    },
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Gmail connection (${resp.status} ${resp.statusText})`,
    );
  }
  const body = (await resp.json()) as { items?: ConnectorItem[] };
  const item = body.items?.[0];
  const token =
    item?.settings?.access_token ??
    item?.settings?.oauth?.credentials?.access_token;
  if (!token) {
    throw new Error(
      "Gmail connection is missing an access token. Please re-authorize Gmail.",
    );
  }
  cached = { token, expiresAt: Date.now() + 5 * 60 * 1000 };
  return token;
}

function buildMimeMessage({
  to,
  subject,
  html,
  text,
}: SendReportEmailArgs): string {
  const boundary = `=_resumelens_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const lines = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ];
  return lines.join("\r\n");
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendReportEmail(args: SendReportEmailArgs): Promise<void> {
  const accessToken = await getGmailAccessToken();
  const raw = base64UrlEncode(buildMimeMessage(args));

  const resp = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!resp.ok) {
    cached = null;
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Gmail send failed (${resp.status} ${resp.statusText})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
}

export type { SendReportEmailArgs };
