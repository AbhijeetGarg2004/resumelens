# ResumeLens

AI-powered resume analyzer. Upload a PDF resume, optionally pick a target role, and get an instant on-screen score plus a detailed report delivered to your inbox.

## What it does

- Upload a PDF resume (up to 10 MB)
- Pick a target role (Frontend, Backend, Full Stack, DevOps, Data Scientist, Product Manager, UI/UX Designer, HR, Other) or run a general evaluation
- Get an instant analysis with:
  - Overall score and ATS compatibility score
  - Verdict and summary
  - Strengths
  - Missing skills and improvement suggestions
  - Recommended keywords
  - A final recommendation
- Receive the full report by email

## Tech Stack

**Frontend**
- React 19 + Vite
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (via generated API client)
- Lucide icons

**Backend**
- Node.js 24 + Express 5
- TypeScript
- `pdf-parse` for PDF text extraction
- Zod for request validation
- Pino for logging

**AI & Services**
- Google Gemini 2.5 Flash (structured JSON output) for resume analysis
- Resend for transactional email delivery

**Tooling**
- pnpm workspace monorepo
- OpenAPI + Orval for typed API client/server contract codegen
- Drizzle ORM + PostgreSQL (provisioned, ready for future use)
- esbuild for the API server bundle

## Project Structure

```
artifacts/
  resumelens/      # React + Vite frontend
  api-server/      # Express API
  mockup-sandbox/  # UI prototyping playground
lib/
  api-spec/        # OpenAPI source of truth
  api-zod/         # Generated Zod schemas
  api-client-react/# Generated React Query hooks
  db/              # Drizzle schema
  integrations-gemini-ai/
```

## Local Development

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/resumelens run dev
```

## Environment Variables

- `RESEND_API_KEY` — required, for sending email reports
- `RESEND_FROM_EMAIL` — optional, defaults to `onboarding@resend.dev` (test sender; verify a domain at resend.com/domains to send to arbitrary recipients)
- `DATABASE_URL` — provisioned automatically
- `SESSION_SECRET` — provisioned automatically

Built on [Replit](https://replit.com).
