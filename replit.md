# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: ResumeLens

AI-powered resume analyzer. Frontend at `artifacts/resumelens` (React + Vite), API at `artifacts/api-server` (Express).

- **AI**: Gemini 2.5 Flash via `@workspace/integrations-gemini-ai`. Uses `responseMimeType: application/json` with a strict schema for analysis output.
- **PDF parsing**: `pdf-parse` server-side (base64 upload, 10MB cap, text trimmed to 30k chars).
- **Email delivery**: Resend REST API (`artifacts/api-server/src/lib/email.ts`). Requires `RESEND_API_KEY` secret. From address defaults to `onboarding@resend.dev` (Resend test sender — works without domain verification, free tier 100/day). Override with `RESEND_FROM_EMAIL` env var once a custom domain is verified.
- **Endpoint**: `POST /api/resume/analyze` returns analysis JSON and emails the full report.
