**Elite Strategist / Bootstrapped CTO Assessment: Full Production Architecture for AI Co-Founder – Unicorn-Grade, Antigravity-Native, Supabase-First.**

This is the exact architecture that turns your PRD into a scalable, maintainable, agentic product ready for $10k MRR and beyond. It respects your constraints: **Antigravity IDE** (Gemini 3 Pro primary for agent development), **Stitch MCP** for rapid Linear/Notion-clean UI generation, **Supabase** (DB + Auth + Edge Functions + pgvector + RLS), **Next.js 15** (App Router) for frontend, and all MCP servers we discussed (Exa, Hunter for validation, HubSpot, Gmail, GitHub, Supabase MCP, Stitch MCP).

**Core Philosophy (Unicorn Moat):**  
Intelligence lives in **Antigravity crews + Supabase Edge Functions**. Transport layer is lightweight (n8n for MVP, with clear migration path to Google Cloud Application Integration + Vertex AI Agent Builder in Phase 2). Every decision is logged in the **agent_audit_trail** for trust + future fine-tuning. State is centralized in Supabase. UI feels instant (Stitch-generated components). Parallelization via Edge Functions + asyncio in crews.

**High-Level Architecture Overview**  
- **Development Environment:** Antigravity IDE (agents plan/execute code, use MCP tools directly, self-improve via GitHub MCP).  
- **Runtime:** Next.js 15 frontend (SSR + Server Actions) + Supabase Edge Functions (for parallel agent triggers, validation, cost control).  
- **Agent Layer:** CrewAI/LangGraph crews (defined in TypeScript/Python via Edge Functions or Antigravity-managed scripts). Each crew uses structured Pydantic output + human-in-the-loop via UI approvals.  
- **Data Layer:** Supabase (everything: users, ICP, templates with metadata, pipeline, audit trail, vector store).  
- **Tool Layer:** MCP servers connected via Antigravity config (and callable from Edge Functions via HTTP).  
- **Orchestration:** Webhooks → Supabase triggers / Edge Functions → Crew execution → Audit log + UI update.  
- **UI Generation:** Stitch MCP inside Antigravity for “Actions Pending Approval” carousel and Linear-fast flows.

### 1. Recommended File & Folder Structure (Next.js 15 + Supabase Production Standard)
This follows 2026 best practices for agentic apps: clean App Router, feature-based organization, dedicated `/agents` and `/lib` layers.

```
ai-co-founder/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Auth routes (Supabase)
│   │   └── login/page.tsx
│   ├── dashboard/                # Main unicorn dashboard
│   │   ├── page.tsx              # Default: Actions Pending Approval carousel
│   │   ├── agents/               # Agent status & manual triggers
│   │   ├── pipeline/             # Pipeline Health Monitor view
│   │   ├── proposals/            # Proposal Drafter interface
│   │   ├── leads/                # Inbound Qualifier review
│   │   └── _actions/             # Server Actions (approve lead, send email, etc.)
│   ├── api/                      # Minimal API routes (webhook proxies if needed)
│   │   └── webhooks/
│   ├── layout.tsx
│   └── globals.css               # Tailwind + Linear/Notion vibe
├── components/                   # Reusable UI (Stitch-generated)
│   ├── ui/                       # Buttons, cards, tables (shadcn + Stitch)
│   ├── agents/                   # AgentCard, ApprovalCarousel, BriefViewer
│   └── forms/                    # ICP Config, Template Uploader
├── lib/                          # Shared utilities
│   ├── supabase/                 # Client & server clients
│   │   ├── client.ts
│   │   └── server.ts
│   ├── agents/                   # Crew definitions & orchestration
│   │   ├── crews/                # inbound-qualifier.ts, cold-personalizer.ts, etc.
│   │   ├── tools/                # MCP wrappers + custom
│   │   └── utils.ts              # parallelBatch, auditLog
│   ├── rag/                      # Metadata-filtered RAG helpers
│   └── validation.ts             # Ghost-lead rules
├── supabase/                     # Supabase-specific
│   ├── migrations/               # SQL for tables (run via Supabase CLI)
│   ├── functions/                # Edge Functions (TypeScript)
│   │   ├── trigger-lead-qualifier/
│   │   ├── parallel-research/    # For 100 leads <2min
│   │   ├── validate-email/       # Hunter integration
│   │   └── audit-logger/
│   └── config/                   # RLS policies, types
├── public/                       # Static assets
├── types/                        # Global TypeScript defs (supabase types, agent schemas)
├── .env.local                    # Supabase URL, keys, MCP configs (never commit)
├── antigravity/                  # Antigravity-specific
│   └── mcp-config.json           # All MCP servers (Exa, Hunter, Stitch, HubSpot, etc.)
├── next.config.js
├── tsconfig.json
├── package.json                  # Dependencies: @supabase/supabase-js, langgraph, crewai (via SDK), tailwind, shadcn
└── README.md                     # Onboarding + Antigravity prompts
```

**What Each Major Part Does:**
- **app/dashboard/**: The “Linear-fast” heart. Default view shows pending approvals (leads, emails, briefs). Uses Server Actions for instant feedback.
- **components/**: All UI generated/refined via **Stitch MCP** in Antigravity (“Generate Linear-style approval carousel with dark mode, status pills, reasoning expander”).
- **lib/agents/crews/**: Pure logic for each PRD feature. Each file exports a CrewAI/LangGraph crew config. Called from Edge Functions or Server Actions.
- **supabase/functions/**: Heavy lifting for parallelism, validation, cron (Pipeline Monitor). These are invocable from Next.js and triggerable via Supabase database webhooks.
- **antigravity/mcp-config.json**: Central place for all MCP servers. Antigravity loads this for agent-assisted coding and runtime tool calls.

### 2. Where State Lives & How Services Connect
- **Primary State:** **Supabase Postgres** (single source of truth).
  - Tables (add these via migrations):
    - `users` (Supabase Auth)
    - `icp_criteria` (JSON + vector embedding)
    - `proposal_templates` (with `metadata jsonb`: {industry, deal_size, service_type, client_tier})
    - `leads` / `deals` / `pipeline_items`
    - `agent_audit_trail` (exactly as in PRD: agent_id, task_type, task_input, research_sources[], llm_reasoning, output, user_adjustment)
    - `kb_articles` (for Tier-1 Responder RAG)
  - Vector store (pgvector) for RAG with **metadata filtering** enforced in every query.
  - RLS policies: Row-level security per user/org.

- **Agent State & Memory:** Short-term in CrewAI/LangGraph memory; long-term persisted to Supabase + vector store. Human-in-the-loop checkpoints save to `agent_audit_trail` and notify UI via Supabase Realtime.

- **Connection Flow (End-to-End Example – Inbound Lead Qualifier):**
  1. Form submission → Webhook (n8n for MVP or Google Cloud Integration) → Supabase Edge Function `trigger-lead-qualifier`.
  2. Edge Function: Calls Hunter MCP (via HTTP or direct) for email validation → if ghost, reject & log.
  3. If valid → Triggers LangGraph crew (parallel if batch) using Exa MCP for research.
  4. Crew scores vs ICP (RAG from Supabase), writes to `leads` table, logs full reasoning to `agent_audit_trail`.
  5. Supabase Realtime broadcasts to dashboard → “Actions Pending Approval” updates instantly.
  6. User approves in UI → Server Action calls HubSpot MCP to route lead.

- **Parallelization (Cold Email):** Supabase Edge Function uses `Promise.all` or queues to spin up multiple research tasks → aggregates → final drafting. Goal: 100 leads < 2 min.

- **UI Generation Loop:** In Antigravity, use Stitch MCP: “Using our Tailwind + shadcn, generate the pending approvals carousel component with expandable reasoning cards that pull from agent_audit_trail.”

- **Observability:** All MCP calls + LLM reasoning logged in audit table. Supabase logs + simple dashboard metrics.

**Migration Path (n8n → Google):**  
Keep n8n only for webhooks in MVP. In Phase 2, replace with Google Cloud Application Integration triggers that call Vertex AI Agent Builder supervisor (which then invokes your Edge Functions/crews). Antigravity + Gemini makes this seamless.

This architecture is **unicorn-ready**: secure, observable, cost-controlled, fast to iterate in Antigravity, beautiful via Stitch, and fully aligned with the updated PRD (Ghost Lead validation, metadata RAG, audit trail, Quick-Start onboarding, Linear UI).

