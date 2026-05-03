# CLAUDE.md

This file documents the SalesOS codebase for AI assistants working in this repository.

## What This Project Is

**SalesOS** is an autonomous sales intelligence platform for SMBs and solopreneurs. It runs AI agent crews (backed by CrewAI/LangGraph) that research, qualify, personalize, and draft — with humans approving actions before they send. The backend is entirely Supabase (Postgres + Auth + Edge Functions + Realtime + pgvector). The frontend is Next.js 16 App Router with React 19.

---

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server (hot reload) |
| `pnpm build` | Production build (runs `pnpm install --no-frozen-lockfile` first) |
| `pnpm lint` | ESLint across the codebase |
| `pnpm start` | Serve the production build locally |

**Package manager:** pnpm 10.33.0 (required). Use `pnpm`, not `npm` or `yarn`.  
**Node version:** >=20 (see `.nvmrc`).

---

## Environment Variables

Create `.env.local` at the repo root (never commit it — it's in `.gitignore`).

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never expose to browser
```

CI/CD (GitHub Secrets): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

---

## Project Structure

```
SalesOS/
├── app/                         # Next.js App Router
│   ├── (auth)/layout.tsx        # Unauthenticated layout wrapper
│   ├── login/page.tsx           # Sign-in page (client component)
│   ├── signup/page.tsx          # Sign-up page
│   ├── layout.tsx               # Root layout (Geist fonts, metadata)
│   ├── page.tsx                 # Landing page → redirects to /dashboard
│   └── dashboard/
│       ├── page.tsx             # Main dashboard (Server Component, force-dynamic)
│       ├── layout.tsx           # Auth guard + Sidebar layout
│       ├── DashboardClient.tsx  # Interactive carousel (Client Component)
│       ├── _actions/            # Shared Server Actions (proposal-draft, lead-qualifier, cold-personalizer)
│       ├── leads/               # Lead management
│       ├── prospects/           # Prospect CSV upload + processing
│       ├── agents/
│       │   ├── cold-emails/     # Cold email personalizer UI
│       │   └── meeting-prep/    # Meeting prep brief UI
│       ├── proposals/           # Proposal drafter UI
│       ├── closing/             # Contracts/closing UI
│       ├── handoffs/            # Team handoff UI
│       ├── whatsapp/            # WhatsApp integration UI
│       ├── collateral/          # Marketing collateral UI
│       └── settings/            # ICP config + quick-start
├── components/
│   ├── AgenticLedger.tsx        # Audit trail viewer component
│   └── dashboard/
│       ├── Sidebar.tsx          # Navigation sidebar (client component)
│       └── DryRunToggle.tsx     # Global dry-run toggle
│   └── ui/
│       └── CollateralCarousel.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts            # Server Supabase client + service-role client
│   │   └── realtime.ts          # Realtime helpers
│   ├── crews/                   # Agent crew implementations
│   │   ├── runner.ts            # Unified crew runner (all crews go through here)
│   │   ├── inbound-qualifier.ts # Lead qualification crew
│   │   ├── cold-personalizer.ts # Cold email personalization crew
│   │   ├── lead-validation.ts   # Ghost-lead validation crew
│   │   └── proposal-drafter.ts  # Proposal drafting crew
│   ├── agents/
│   │   ├── crews/               # Additional crew configs
│   │   ├── tools/               # MCP wrappers + custom tools
│   │   └── utils.ts             # parallelBatch, auditLog helpers
│   ├── rag/
│   │   ├── proposal-rag.ts      # Metadata-filtered proposal template RAG
│   │   ├── collateral-rag.ts    # Collateral RAG
│   │   └── icp-rag.ts           # ICP criteria RAG
│   └── useRealtimeUpdates.ts    # useAgentAuditTrailChanges hook
├── supabase/
│   ├── config.toml
│   ├── migrations/              # All schema changes (run in order)
│   └── functions/               # Deno Edge Functions
│       ├── _shared/cost-guard.ts  # Budget check + usage reporting helpers
│       ├── validate-email/        # Hunter email validation (no-JWT)
│       ├── research-company/      # Exa company research (no-JWT)
│       ├── score-lead/            # Lead scoring against ICP (no-JWT)
│       ├── trigger-lead-qualifier/ # Webhook entry for lead qualification (no-JWT)
│       ├── parallel-research/     # Batch parallel research
│       ├── pipeline-monitor/      # Daily cron pipeline health check
│       ├── process-bulk-prospects/ # Bulk prospect processing
│       ├── upload-collateral/     # Collateral file upload handler
│       └── validate-linkedin/     # LinkedIn profile validation
├── types/
│   └── ledger.ts                # Log interface for agent audit trail
├── antigravity/
│   └── mcp-config.json          # MCP server configs (Exa, Hunter, HubSpot, Gmail, Stitch, Pylon)
└── .github/workflows/ci-cd.yml  # CI: lint → build → migrate → Vercel → Edge Functions
```

---

## Key Architecture Patterns

### Supabase Client Usage

**Always use the right client for the context:**

- **Browser / Client Components**: `import { createClient } from '@/lib/supabase/client'` — uses `createBrowserClient` from `@supabase/ssr`, handles cookies automatically.
- **Server Components / Server Actions / Route Handlers**: `import { createClient } from '@/lib/supabase/server'` — async, reads cookies via `next/headers`.
- **Service-role (admin writes, bypasses RLS)**: `import { getSupabaseServer } from '@/lib/supabase/server'` — **never use this in client components or expose to the browser.**

### Authentication & Route Protection

The `app/dashboard/layout.tsx` is a Server Component that calls `supabase.auth.getUser()` and redirects to `/login` if no session exists. All `/dashboard/*` routes are automatically protected.

### Agent Crews

All crew executions go through `lib/crews/runner.ts → runCrew()`. It:
1. Logs `crew_started` to `agent_audit_trail`
2. Dynamically imports and runs the requested crew
3. Logs `crew_completed` to `agent_audit_trail`

Available crew types: `'proposal-drafter' | 'lead-qualifier' | 'lead-validation' | 'cold-personalizer'`

**Current status:** The crew files in `lib/crews/` are stub implementations returning deterministic mock outputs. Replace them with real LangGraph/CrewAI logic connected to MCP tools.

### Server Actions Pattern

Each dashboard feature has its own `actions.ts` (or `_actions/` sub-directory for shared actions). These are `'use server'` functions that call crew runners or write directly to Supabase.

```
app/dashboard/[feature]/actions.ts        # feature-local server actions
app/dashboard/_actions/[crew]/server.ts   # shared crew-trigger server actions
```

### Realtime Updates

`lib/useRealtimeUpdates.ts` exports `useAgentAuditTrailChanges(onChange)`. The dashboard uses this hook to re-fetch pending actions whenever the `agent_audit_trail` table is mutated by an agent run.

### RAG with Metadata Filtering

**Critical:** All RAG queries against `proposal_templates` and `icp_criteria` must use JSONB containment filtering (`@>`) to prevent cross-client data leakage. See `lib/rag/proposal-rag.ts`:

```typescript
query = query.contains('metadata', { industry: 'SaaS', deal_size: 'mid-market' });
```

Never retrieve templates without a metadata filter in multi-tenant context.

### Cost Guardrails

Edge Functions must call `checkBudget(supabase, userId)` from `supabase/functions/_shared/cost-guard.ts` before performing expensive LLM or research operations. If it returns `false`, return 402 and skip the operation. Call `reportUsage(supabase, userId, tokens)` after completion.

### Dry-Run Mode

The sidebar includes a `DryRunToggle`. When enabled, agent crews should simulate actions without writing to external services (CRM, email send). All crew implementations must respect this flag.

---

## Database Schema

Migrations live in `supabase/migrations/` and are applied in timestamp order.

| Table | Purpose |
|-------|---------|
| `icp_criteria` | ICP profiles per user; `embedding vector(1536)` for RAG, `metadata jsonb` for filtering |
| `proposal_templates` | Proposal templates; `embedding vector(1536)`, `metadata jsonb` (`industry`, `deal_size`, `service_type`, `client_tier`) |
| `leads` | Inbound leads; statuses: `pending`, `qualified`, `rejected`, `in_progress`, `completed`, `failed`, `draft` |
| `agent_audit_trail` | **Immutable** agent action log — INSERT-only RLS, no UPDATE/DELETE. Every crew run logs here. |
| `cold_emails` | Cold email drafts; statuses include `pending_approval` |
| `user_budgets` | Per-user token budget (`token_limit`, `token_used`, `is_over_limit`) |
| `user_agent_settings` | Per-user agent configuration |
| `marketing_collateral` | Uploaded collateral files |
| `prospect_lists` | Prospect CSV imports |
| `whatsapp_messages` | WhatsApp conversation messages |
| `team_handoffs` | Team handoff records |
| `contracts` | Contracts/closing documents |

**RLS is enabled on all tables.** Every table enforces `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE.

**pgvector** is enabled (`CREATE EXTENSION IF NOT EXISTS vector`). Embeddings use 1536 dimensions (OpenAI `text-embedding-3-small`). Indexes use `ivfflat` with `vector_cosine_ops`.

---

## Edge Functions

Deployed to Supabase as Deno functions. Key distinction:

- **No-JWT functions** (`validate-email`, `research-company`, `score-lead`, `trigger-lead-qualifier`): Accept webhook calls without a user JWT. Validate `userId` from request body.
- **JWT-verified functions** (all others): Standard user-authenticated calls.

**Deployment:** `supabase functions deploy <name> --project-ref $REF [--no-verify-jwt] --use-api`. Deploy **one function at a time** — passing multiple names is not supported by the CLI.

---

## CI/CD Pipeline

`.github/workflows/ci-cd.yml` runs on push to `main`:

1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Lint (`pnpm run lint`)
3. Build (`pnpm next build`)
4. Apply DB migrations (`supabase db push --linked`)
5. Deploy to Vercel production
6. Deploy all Edge Functions (one by one)
7. Auto-commit any generated file changes (lockfile mutations)

---

## MCP Servers

Configured in `antigravity/mcp-config.json`. API keys are placeholders — populate in `.env.local` and your Antigravity IDE config:

| Server | Purpose |
|--------|---------|
| `exa-mcp-server` | Company research, web search |
| `hunter-mcp-server` | Email validation (ghost-lead detection) |
| `hubspot-mcp-server` | CRM read/write |
| `gmail-mcp-server` | Email send |
| `stitch-mcp-server` | UI component generation |
| `pylon-mcp-server` | Deep research (optional) |
| `testsprite-mcp-server` | Testing automation |

---

## Conventions

- **No auto-send**: Cold emails and proposals require explicit user approval in the UI before any external action. Never trigger a send from a crew without a human-in-the-loop checkpoint.
- **Audit everything**: Every agent action must log to `agent_audit_trail`. Use `runCrew()` — it handles logging automatically.
- **Metadata filtering**: Always filter RAG queries by metadata. Never retrieve all templates globally.
- **Server vs client imports**: Never import `@/lib/supabase/server` in a Client Component. Never use `getSupabaseServer()` anywhere that could run in the browser.
- **Feature-based file structure**: New dashboard features follow the pattern `app/dashboard/[feature]/page.tsx` (Server Component) + `[feature]/[Feature]Client.tsx` (Client Component) + `[feature]/actions.ts` (Server Actions).
- **TypeScript**: Strict mode. All crew inputs/outputs have exported interfaces in their respective crew files.
- **Styling**: Tailwind CSS v4, dark theme (`bg-black`, `bg-zinc-950`), zinc color scale for UI chrome, white for primary actions.
