# AI Co-Founder – Granular MVP Build Plan (tasks.md)

Version: 1.1 (April 20, 2026) – Updated with security, concurrency, and
dependency injection refinements Goal: Complete MVP (Features 1-4 from PRD) with
zero ambiguity, maximum testability, and production security.

Stack Reminder: Antigravity IDE (Gemini 3 Pro), Supabase (Postgres + Edge
Functions + pgvector + RLS), Next.js 15 App Router, CrewAI (hierarchical +
async), MCP servers (Exa, Hunter, Supabase, GitHub, HubSpot, Gmail, Stitch,
TestSprite).

Strict Rules (enforced by system prompt):

- One task only. Absolute minimum code. No sweeping changes.
- Before coding: Threat model – least-privilege units, sandbox MCP calls, treat
  code as untrusted.
- After task: Stop. Output summary + changes + "Manual Steps for You".
- Test with exact TestSprite prompt. Commit only after green.

## Pre-Task 0: Environment Readiness (Do This First – Do Not Skip)

Before starting Task 1:

- Ensure supabase-cli is installed (`npm install -g supabase`).
- Run `supabase init` and `supabase login` to create a clean local project.
- Create a fresh Supabase project in the dashboard (enable pgvector).
- Set environment variables securely: SUPABASE_URL, SUPABASE_ANON_KEY (public),
  SUPABASE_SERVICE_ROLE_KEY (server-only, never in frontend).
- The LLM can output exact commands if needed, but start with a clean slate.

**Task 1: Initialize Next.js + Supabase client setup with proper key
separation**\
Concern: Project scaffolding + dependency injection for Supabase clients only.\
Start: Pre-Task 0 complete, clean workspace.\
End: lib/supabase/server.ts (uses service role key internally) and client.ts
(anon key only) exist; pnpm dev runs cleanly.\
Instructions: Create folder structure from architecture.md. Implement clear
separation – anon key for client-side, service role **only** in server/Edge
contexts. Use dependency injection pattern for clients.\
TestSprite verification prompt: "Verify Supabase clients are correctly
initialized with anon key on client and service role isolated to server. Confirm
no service role key exposure in frontend bundle or client code. Run pnpm dev and
basic query test."

**Task 2: Add MCP config JSON to Antigravity**\
Concern: All MCP servers connected and discoverable only.\
Start: Task 1 complete.\
End: antigravity/mcp-config.json exists with Exa, Hunter, Supabase, GitHub,
HubSpot, Gmail, Stitch, TestSprite; Antigravity shows them as Connected.\
Instructions: Add each MCP server via Antigravity MCP Store (use scoped API
keys). Export full config.\
TestSprite verification prompt: "Confirm all 8 MCP servers are listed in
mcp-config.json and return healthy status. Test basic Supabase MCP query and Exa
MCP search."

**[COMPLETED] Task 3: Create Supabase migration for core tables**\
Concern: Base schema + metadata tagging only (icp_criteria,
proposal_templates).\
Start: Task 2 complete.\
End: Migration in supabase/migrations/ applied; tables exist with metadata jsonb
column and basic RLS.\
Instructions: Use Supabase MCP to generate and run SQL (enable vector
extension).\
TestSprite verification prompt: "Validate schema: tables exist, metadata is
jsonb, vector extension enabled, RLS policies active, and sample INSERT/SELECT
works without privilege errors."

**[COMPLETED] Task 4: Create agent_audit_trail table + basic insert helper**\
Concern: Audit ledger only – this is the commercialization backbone for
explaining agent decisions (e.g., "Why was this lead rejected?").\
Start: Task 3 complete.\
End: agent_audit_trail table live; lib/agents/utils.ts has secure
logToAuditTrail function.\
Instructions: Apply exact CREATE TABLE; implement helper with least-privilege
(insert only, no delete/update).\
TestSprite verification prompt: "Insert test audit row and query it back. Verify
it captures research_sources, llm_reasoning, and user_adjustment without
sensitive token leakage."

## Phase 1: Ghost-Lead Validation & Inbound Lead Qualifier

**[COMPLETED] Task 5: Build validate-email Edge Function (Mocked)**\
Concern: Hunter MCP integration + ghost-lead scoring only.\
Start: Task 4 complete.\
End: supabase/functions/validate-email/index.ts deployed; returns 0-100 score.\
Instructions: Function calls Hunter MCP (sandboxed key), scores
email/domain/disposable, rejects <70, logs to audit_trail. Least-privilege:
read-only on leads.\
TestSprite verification prompt: "Test 5 emails (2 ghost, 3 real). Verify correct
rejection, no Exa calls on ghosts, audit log entry, and sandbox isolation (no
pivot to other tables)."

**[COMPLETED] Task 6: Create Lead Validation Crew**\
Concern: Validation crew logic only (no research).\
Start: Task 5 complete.\
End: lib/agents/crews/lead-validation.ts exports runnable CrewAI crew
(hierarchical if multi-step).\
Instructions: Use CrewAI with Pydantic output; call Edge Function. Sandbox MCP
calls.\
TestSprite verification prompt: "Run crew on sample payload. Confirm ghost leads
rejected before any research; full audit trail with llm_reasoning; no prompt
injection vectors."

**[COMPLETED] Task 7: Create Inbound Lead Qualifier Crew**\
Concern: Exa research + ICP scoring only (post-validation).\
Start: Task 6 complete.\
End: lib/agents/crews/inbound-qualifier.ts complete with structured scoring.\
Instructions: Chain after validation; use Exa MCP + Supabase vector RAG for ICP.
Apply hierarchical manager for delegation.\
TestSprite verification prompt: "End-to-end on 3 valid test leads: research →
score → write to leads table. Verify 95%+ accuracy, metadata filtering, and
audit trail completeness."

**[COMPLETED] Task 8: Trigger lead-qualifier Edge Function (webhook
entrypoint)**\
Concern: Webhook → validation → qualifier chain only.\
Start: Task 7 complete.\
End: supabase/functions/trigger-lead-qualifier/index.ts deployed.\
Instructions: Accept Typeform-style payload; call crews internally. Sandbox all
external calls.\
TestSprite verification prompt: "Simulate webhook payload. Verify full flow,
audit logging, and no data exfiltration."

**[COMPLETED] Task 9: Add Supabase realtime subscription for leads table**\
Concern: Dashboard notification only.\
Start: Task 8 complete.\
End: Realtime channel set up in lib/supabase/.\
TestSprite verification prompt: "Insert test lead; confirm realtime event fires
and broadcasts qualified lead data securely (no over-exposure)."

**[COMPLETED] Task 10: Human-in-the-loop approval UI stub (leads page)**\
Concern: Pending approval card only (Stitch-generated).\
Start: Task 9 complete.\
End: app/dashboard/leads/page.tsx shows one approval card.\
Instructions: Use Stitch MCP for Linear-style card with expandable reasoning
from audit_trail.\
TestSprite verification prompt: "Render page; approve button logs
user_adjustment to audit_trail without breaking existing flows."

## Phase 2: Cold Email Personalizer

**[COMPLETED] Task 11: Parallel research Edge Function with concurrency
control**\
Concern: Batch research only (<2 min goal) with safe concurrency.\
Start: Task 10 complete.\
End: supabase/functions/parallel-research/index.ts uses chunked processing with
configurable batchSize (default 20–50).\
Instructions: Implement Promise.all on batches only; add batchSize variable;
basic rate-limit awareness (e.g., small delay or queue). Sandbox all MCP calls.\
TestSprite verification prompt: "Process 50 leads with batchSize=20; confirm <2
min runtime, no rate limit errors, results cached, and proper isolation."

**[COMPLETED] Task 12: Cold Email Personalizer Crew**\
Concern: Research → personalized opener + full email only.\
Start: Task 11 complete.\
End: lib/agents/crews/cold-personalizer.ts complete (dry-run).\
Instructions: Use parallel research + hierarchical manager; enforce dry-run.\
TestSprite verification prompt: "Run on CSV sample; verify personalization
quality via audit trail and no real send."

**[COMPLETED] Task 13: Gmail MCP send stub (dry-run mode)**\
Concern: Email sending with approval gate only.\
Start: Task 12 complete.\
End: Send function integrated with explicit approve.\
TestSprite verification prompt: "Dry-run 5 emails; confirm no actual send and
full audit logging."

**[COMPLETED] Task 14: Cold emails UI (pending approval carousel)**\
Concern: Review + approve UI only (Stitch).\
Start: Task 13 complete.\
End: app/dashboard/agents/cold-emails/page.tsx with carousel.\
Instructions: Stitch-generated Linear-fast design.\
TestSprite verification prompt: "Approve one email; verify send trigger + audit
update."

**[COMPLETED] Task 15: CSV upload + trigger flow**\
Concern: Upload → parallel personalizer only.\
Start: Task 14 complete.\
End: Server Action triggers Edge Function.\
TestSprite verification prompt: "Upload test CSV; confirm processing and queue
population."

## Phase 3: Meeting Prep Brief + Proposal Auto-Drafter

**[COMPLETED] Task 16: Meeting Prep Brief Crew**\
Concern: Trigger → 1-page brief only.\
Start: Task 15 complete.\
End: lib/agents/crews/meeting-prep.ts complete.\
Instructions: Pull CRM + Exa; structured output.\
TestSprite verification prompt: "Generate brief for test meeting; matches PRD
one-page format."

**[COMPLETED] Task 17: Proposal templates with metadata RAG**\
Concern: Metadata filtering query only.\
Start: Task 16 complete.\
End: lib/rag/proposal-rag.ts with @> filter.\
Instructions: Enforce industry/deal_size/service_type matching.\
TestSprite verification prompt: "Query returns only matching templates; no
cross-client contamination."

**[COMPLETED] Task 18: Proposal Auto-Drafter Crew**\
Concern: Input → full draft using RAG only.\
Start: Task 17 complete.\
End: lib/agents/crews/proposal-drafter.ts complete.\
Instructions: Use metadata RAG; 90%+ fidelity.\
TestSprite verification prompt: "Draft proposal on test data; verify template
fidelity and audit trail."

**[COMPLETED] Task 19: Proposal UI + editable output**\
Concern: Drafter interface only.\
Start: Task 18 complete.\
End: app/dashboard/proposals/page.tsx with form + output.\
Instructions: Stitch-generated.\
TestSprite verification prompt: "Generate + edit proposal; saves draft
correctly."

**[COMPLETED] Task 20: Pipeline Health Monitor cron Edge Function (starter)**\
Concern: Daily scan + flag only.\
Start: Task 19 complete.\
End: supabase/functions/pipeline-monitor/index.ts (basic version).\
Instructions: Scan deals; log risks to audit.\
TestSprite verification prompt: "Run on test pipeline; flags stalled deals with
correct reasoning."

## Phase 4: Frontend Polish & Beta Readiness

**[COMPLETED] Task 21: Dashboard home – Actions Pending Approval carousel**\
Concern: Main summary UI only.\
Start: Task 20 complete.\
End: app/dashboard/page.tsx with summary of all agents.

**[COMPLETED] Task 21.1: Global Sidebar & Navigation**\
Concern: Unified navigation only.\
Start: Task 21 complete.\
End: app/dashboard/layout.tsx with persistent Sidebar.

**[COMPLETED] Task 22: Quick-Start MCP onboarding flow**\
Concern: LinkedIn/website → auto-ICP only.\
Start: Task 21 complete.\
End: One-click button triggers Exa + ICP crew.

**[COMPLETED] Task 23: Auth + RLS enforcement across dashboard pages**\
Concern: Security hardening only.\
Start: Task 22 complete.\
End: All pages respect RLS and user sessions.

**[COMPLETED] Task 24: Cost guardrails in Edge Functions**\
Concern: Token budget check only.\
Start: Task 23 complete.\
End: Every Edge Function checks budget before crew kickoff.

**[COMPLETED] Task 25: Dry-run toggle visible in UI for all agents**\
Concern: Safety toggle only.\
Start: Task 24 complete.\
End: Global toggle in dashboard.

**[COMPLETED] Task 26: Basic analytics (actions run this week)**\
Concern: Simple dashboard metric only.\
Start: Task 25 complete.\
End: Widget showing weekly actions from audit_trail.

**[COMPLETED] Task 27: GitHub MCP self-PR workflow stub**\
Concern: Basic self-improvement hook only.\
Start: Task 26 complete.\
End: Simple command to create PR for code changes.

**[COMPLETED] Task 28: Full TestSprite suite on MVP features**\
Concern: End-to-end coverage only.\
Start: Task 27 complete.\
End: Comprehensive test run covering PRD Features 1-4.

**[COMPLETED] Task 29: MVP Beta Release Checklist**\
Concern: Final wiring and deployment only.\
Start: Task 28 complete.\
End: 3 vertical templates loaded; Vercel deploy ready; beta invite flow.\
Instructions: Smoke test all 4 MVP features.\
TestSprite verification prompt: "End-to-end test of Inbound Qualifier, Cold
Personalizer, Meeting Brief, Proposal Drafter with live webhooks and approvals."

**Phase A: Marketing Collateral Upload & Pre-Sales Push (Tasks 30–33)**

**[COMPLETED] Task 30: Supabase migration for marketing_collateral table** Concern: New table +
vector + metadata only. Start: Current beta state. End: Migration applied with
RLS (user owns their collateral). Instructions: Create table with storage
integration hook. TestSprite: "Validate table exists, metadata jsonb works,
vector index ready, RLS enforces ownership."

**[COMPLETED] Task 31: Collateral upload Edge Function + UI component** Concern: File upload\
to Supabase Storage + basic parsing only. Start: Task 30 done. End: Edge\
Function + dashboard upload modal (Stitch-generated). Instructions: Use Supabase\
Storage; return file_url. TestSprite: "Upload sample PDF; confirm stored and\
metadata saved."

**[COMPLETED] Task 32: Collateral RAG Crew** Concern: Metadata-filtered retrieval only\
(extend existing RAG utils). Start: Task 31 done. End:\
lib/agents/crews/collateral-rag.ts – queries by industry/tags/deal_stage.\
Instructions: Integrate into Proposal Drafter and Cold Personalizer (via manager\
delegation). TestSprite: "Query for 'SaaS implementation' returns only matching\
collateral; no contamination."

**[COMPLETED] Task 33: Integrate collateral into existing crews + carousel** Concern: Pull\
from RAG, inject as "Social Proof" or "Technical Specs" section. Start: Task 32\
done. End: Live integration in emails & proposals; new `Carousel` UI component\
to view referenced collateral. Instructions: Add `referenced_collateral` array\
to existing draft outputs. TestSprite: "Generate proposal; confirm it includes a\
'Relevant Case Studies' section with real data from Task 31."

**Phase B: Bulk CSV/Excel Prospect Upload & Evaluation (Tasks 34–36)**

**[COMPLETED] Task 34: Bulk upload Edge Function (parsing)** Concern: CSV/Excel parsing +
validation only (SheetJS/PapaParse). Start: Task 33 done. End: Edge Function
that parses file, creates rows in prospect_lists, triggers evaluation.
Instructions: Client-side preview optional; server-side for security.
TestSprite: "Upload sample CSV; rows parsed, deduped, stored correctly."

**[COMPLETED] Task 35: Bulk Prospect Evaluator Crew** Concern: Parallel enrichment + ICP
scoring only (reuse Task 11 batch logic). Start: Task 34 done. End: Crew that
takes prospect_list_id, fetches all pending leads, runs evaluation for each,
and updates status. Instructions: Reuse lib/agents/crews/prospect-evaluator.ts
logic (Researcher -> Analyst -> Scorer). TestSprite: "Trigger list evaluation;
confirm audit trail shows batch success/failure counts."

**[COMPLETED] Task 36: Bulk upload UI + carousel integration** Concern: Drag-drop +
progress + approval only. Start: Task 35 done. End: New dashboard section
`Prospects` with upload zone + table of lists + progress bars. Instructions:
Use existing UI patterns from Collateral page. TestSprite: "Upload CSV; see
progress bar update as evaluators finish batch chunks."

Phase C: WhatsApp Integration for Follow-Ups & Prospecting (Tasks 37–39)

**[COMPLETED] Task 37: Add whatsapp-mcp to Antigravity config** Concern: MCP connection only
(use your existing fork). Start: Task 36 done. End: Config updated; basic
send/receive tools available. Instructions: Add consent field in leads table.
TestSprite: "MCP healthy; dry-run message generation works."

**[COMPLETED] Task 38: WhatsApp Nurturer Crew** Concern: Personalized follow-up logic only
(trigger on stall or post-proposal). Start: Task 37 done. End: Crew that
generates + queues WhatsApp messages (dry-run). Instructions: Use metadata from
collateral/ICP. TestSprite: "Generate follow-up for stalled lead; audit trail
includes reasoning."

**[COMPLETED] Task 39: WhatsApp UI + approval flow** Concern: Messages appear in carousel
only. Start: Task 38 done. End: New approval type in dashboard. TestSprite:
"Approve WhatsApp message; logs to audit without sending." Phase D: Voice/Call
Prep & Team Collaboration & Handoff Module (Tasks 40–43)

**[COMPLETED] Task 40: Add audio-transcription-mcp (or equivalent)** Concern: MCP for voice
only. Start: Task 39 done. End: Config updated for transcription. TestSprite:
"MCP test transcription succeeds."

**[COMPLETED] Task 41: Voice/Call Prep Crew** Concern: Transcript → summary + objections +
next steps only. Start: Task 40 done. End: voice-call-prep.ts (extend
meeting-prep crew). TestSprite: "Process sample transcript; generates
handoff-ready brief."

**[COMPLETED] Task 42: Team Handoff Crew & Table** Concern: Generate handoff brief + tasks
only. Start: Task 41 done. End: New table handoffs + crew that creates internal
tasks. TestSprite: "Handoff generated with full context from audit trail."

**[COMPLETED] Task 43: Handoff UI in dashboard** Concern: Display + assignment only. Start:
Task 42 done. End: New section in carousel/sidebar for team handoffs.
TestSprite: "End-to-end call prep → handoff visible and assignable."

Phase E: Advanced Qualification & Closing (Tasks 44–46)

**[COMPLETED] Task 44: Negotiation Crew** Concern: Draft justifications for objections based on RAG.
Start: Task 43 done. End: negotiation-handler.ts.
TestSprite: "Objection handled with ROI collateral justification."

**[COMPLETED] Task 45: Contract Generation Crew & Table** Concern: Create contracts table and generator logic.
Start: Task 44 done. End: contracts table + contract-generator.ts.
TestSprite: "Contract generated with lead details and agreed terms."

**[COMPLETED] Task 46: Closing & Contracts Dashboard** Concern: UI for negotiation review and contract downloads.
Start: Task 45 done. End: /dashboard/closing page.
TestSprite: "Contract visible in dashboard and downloadable as Markdown/PDF draft."

**Additional Security Reminders Across All Tasks:**

- Never expose SUPABASE_SERVICE_ROLE_KEY to frontend (Task 1 enforcement).
- All Edge Functions and crews must respect RLS when possible; use service role
  only where absolutely required with explicit least-privilege.
- Log every MCP invocation to agent_audit_trail for traceability.

End of tasks.md
