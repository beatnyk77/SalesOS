# Product Requirements Document (PRD)  
**Product Name:** AI Co-Founder  
**Version:** 1.0 (MVP – Pre-Sales Core + 1 Post-Sale Module)  
**Date:** April 20, 2026  
**Author:** [Your Name] – Bootstrapped Founder (with SuperGrok CTO advisory)  
**Status:** Ready for Antigravity IDE + Claude code gen + MCP integration

## 1. Vision & Value Proposition
**One-sentence vision:**  
AI Co-Founder is the autonomous agentic operating system that turns any SMB or solopreneur into a deal-closing machine by owning 80% of repetitive pre-sales drudgery — so founders spend time winning, not qualifying or prepping.

**Core promise to users:**  
“Plug in your ICP and templates once. Watch agents research, qualify, personalize, prep, draft, monitor, and respond — 24/7 — while you focus on closing. 60–70% faster first contact. 2–3× reply rates. Proposals in 15 minutes. Zero CRM bloat.”

**Differentiation:**  
Not another point tool. Not CRM-tied. A single, dead-simple dashboard where every agent crew works together on Supabase + your chosen MCP servers. Built for non-technical founders (agencies, coaches, SaaS, consultants).

**Business Goal (Bootstrapped):**  
- 50 paid beta users in 60 days  
- $10k MRR by month 4  
- Churn < 8%  
- LTV > 18 months

## 2. Target Users & ICP (Ideal Customer Profile)
- **Primary:** Solopreneurs & 1–10 person teams (agencies, B2B services, coaches, early SaaS)  
- **Secondary:** 11–50 employee SMBs tired of HubSpot bloat  
- **Pain triggers:** Spending >4 hrs/week on lead qualification, cold emails, call prep, proposals, or pipeline babysitting  
- **Tech comfort:** Low-to-medium (they love no-code but need agents to “just work”)  
- **Budget:** $39–$249/mo  
- **Vertical templates (MVP+1):** Agencies, Coaches, SaaS sales, Consulting

**User Personas:**  
1. Solo Founder “Alex” – runs everything himself  
2. Agency Owner “Sarah” – 4 reps, needs pipeline hygiene  
3. Consultant “Mike” – high-ticket deals, needs perfect proposals

## 3. Core Features & Agent Crews
All features run as **autonomous CrewAI/LangGraph crews** inside Antigravity IDE, persisting state in Supabase, calling tools via MCP servers (Exa, HubSpot, Gmail, Supabase MCP, GitHub MCP).

| Feature | Description | Primary MCP Servers Used | Acceptance Criteria | Success Metric (from your original data) |
|---------|-------------|---------------------------|---------------------|-----------------------------------------|
| **1. Inbound Lead Qualifier** | On new form submission (Typeform/Webhook), agent researches company (news, funding, tech stack), scores vs user ICP, routes qualified leads to CRM/Slack/rep inbox. | Exa MCP, Supabase MCP, HubSpot MCP | 95%+ scoring accuracy on test set; human approval gate on first 5 leads per customer | 60–70% reduction in time-to-first-contact |
| **2. Cold Email Personalizer** | Upload CSV/list → parallel research → generates personalized opener + full email. User reviews then sends via Gmail/Outlook. | Exa MCP, Gmail MCP, Supabase MCP | 2–3× reply rate vs templates; dry-run mode mandatory | 2–3× improvement in reply rates |
| **3. Meeting Prep Brief** | On Calendly/HubSpot meeting booked → generates 1-page brief (background, recent news, past interactions, objections, talking points). | Exa MCP, HubSpot MCP, Supabase MCP | Delivered <30 seconds before call; 95% of reps say “ready in 30 sec vs 15 min” | 15 min → 30 sec prep time |
| **4. Proposal Auto-Drafter** | Rep enters project details (or pulls from CRM) → agent drafts full proposal using company template, pricing, terms (stored in Supabase RAG). | Supabase MCP (RAG), HubSpot MCP, Google Docs MCP (optional) | 90%+ template fidelity; editable in Google Docs/Notion | 2 hrs → 15 min creation time |
| **5. Pipeline Health Monitor** | Daily cron: scans Supabase + CRM, flags stalled deals, missing next steps, risk scores. Sends Slack/email alerts to manager. | HubSpot MCP, Supabase MCP | Zero false negatives on test pipelines | Early stall detection (pre-problem) |
| **6. Tier-1 Auto-Responder** (Post-sale MVP module) | Handles common support via product KB (RAG). Resolves 40–60% tickets; escalates with full context. | Supabase MCP (KB), Gmail MCP | Escalation includes full thread summary | 40–60% ticket deflection |
| **7. Onboarding Checklist Manager** (Phase 2) | New employee added → generates personalized checklist, schedules tasks, sends welcome emails, tracks completion. | Supabase MCP, Gmail MCP, Calendar MCP | 100% automation on trigger | Zero manual onboarding setup |

**Agent Orchestration Rules (Non-negotiable):**  
- All crews use **structured output (Pydantic)** + **human-in-the-loop checkpoints** (Antigravity native).  
- Memory: Supabase vector store (pgvector) for ICP, templates, past deals.  
- Research flow: Exa → browse verification → cache in Supabase.  
- No auto-send on cold emails or proposals without explicit user “Approve & Send” in UI.

## 4. Technical Requirements & Stack (2026 Bootstrapped-Optimized)
- **IDE & Agent Runtime:** Antigravity IDE (Gemini 3 Pro primary, Claude 4 fallback for code gen)  
- **Backend/DB:** Supabase (Postgres + Auth + Storage + Edge Functions + pgvector)  
- **Orchestration:** CrewAI (MVP speed) → LangGraph (production v1.1)  
- **MCP Servers (mandatory install):**  
  - exa-mcp-server (your fork)  
  - supabase-mcp-server  
  - github-mcp-server (official)  
  - HubSpot MCP (official)  
  - mcp-gmail (or ms-365)  
  - pylon-mcp (optional deep research)  
- **Integrations (via n8n/Make as glue):** Webhooks (Typeform, Calendly, HubSpot), CRM write-back, Email, Slack/Teams alerts  
- **Frontend:** Simple Next.js 15 + Supabase Auth dashboard (or Antigravity-hosted UI). One screen: “My Agents” + “Pipeline” + “Settings (ICP + Templates)”.  
- **Security & Compliance:** Supabase RLS + MCP scoped keys + dry-run everywhere + GDPR consent tracker.  
- **Cost Guardrails:** Token budget per customer; usage-based overage.

**Non-Functional Requirements:**  
- Latency: < 60 sec for most agent runs  
- Reliability: 99% uptime (Antigravity + Supabase)  
- Scalability: 1,000 actions/mo per $99 customer  
- Observability: LangSmith or Supabase logs + daily pipeline health self-report

## 5. MVP Scope (6–8 Weeks to Paid Beta)
**MVP = Features 1, 2, 3 + 4 (Inbound + Cold Personalizer + Meeting Brief + Proposal Drafter)**  
- 3 vertical templates pre-loaded  
- Dashboard with agent status + manual triggers  
- Beta pricing: $39/mo (200 actions)  

**Phase 2 (Month 2–3):** Pipeline Monitor + Tier-1 Responder  
**Phase 3:** Onboarding + white-label + API for advanced users

## 6. Success Metrics & KPIs
- **Product:** 85%+ of users run ≥3 agent crews weekly  
- **Business:** 30% MoM growth, <10% churn, NPS > 70  
- **Feature:** Track exact lift (time saved, reply rates) via in-app surveys + CRM data

## 7. Risks, Dependencies & Mitigations
- Hallucinations → Multi-step verification + human gate  
- CRM rate limits → Supabase cache layer  
- Cold email deliverability → Built-in warming + user review  
- Dependency on MCP stability → Fallback to n8n HTTP tools  

**Go-Live Checklist (Antigravity ready):**  
1. Supabase project + schema (ICP table, templates, pipeline)  
2. MCP config JSON in Antigravity  
3. CrewAI crews for each feature (I can generate these next)  
4. n8n workflow for webhooks  

**Additional Important Points**
**A. Ghost Lead Problem → Validation Layer (New Pre-Agent Gate)**

Risk closed: No more burning Exa tokens on “asdf@gmail.com”.
Fix: New Lead Validation Crew (runs first, <3 seconds).
MCP tool: Add hunter-mcp-server or abstract-api-mcp (both exist as community/open MCPs; hunter.io has official API → easy MCP wrapper via their SDK).
Flow: Webhook → validate email + domain + disposable check → score 0–100 → if <70, auto-reject + log to Supabase. Only then → Exa research.
Acceptance: 98%+ ghost-lead rejection on test set. Saves ~40% research cost at scale.


**B. RAG Precision → Metadata Filtering (Proposal Auto-Drafter)**

Risk closed: No more Client A pricing bleeding into Client B proposals.
Fix: Supabase pgvector now uses metadata filtering on every query:SQL-- Example agent query
SELECT * FROM proposal_templates 
WHERE metadata @> '{"industry": "SaaS", "deal_size": "mid-market", "service_type": "implementation"}'
ORDER BY embedding <-> query_embedding LIMIT 3;
All templates get tagged at upload: industry, deal_size, service_type, client_tier.
Agent prompt enforces: “Only retrieve and cite documents matching exact metadata filters.”

**C. Tooling Fragility + New “Agentic Ledger” Table**

Risk closed: Debugging and commercialization transparency.
Fix: Intelligence stays 100% in Antigravity + Supabase Edge Functions. n8n (or replacement) is pure transport layer only (webhooks in/out, email send, Slack alerts).
New Supabase table (add immediately):SQLCREATE TABLE agent_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  task_type text NOT NULL,           -- e.g. "inbound_qualifier"
  task_input jsonb,
  research_sources jsonb[],          -- array of Exa links + timestamps
  llm_reasoning text,                -- raw chain-of-thought
  output jsonb,
  user_adjustment jsonb,             -- what human changed
  created_at timestamptz DEFAULT now()
);
Every crew logs here automatically (via Supabase MCP). This becomes your fine-tuning goldmine and trust signal in the UI (“See why the agent scored this lead 92/100”).

Parallelization (Cold Email Personalizer)

New: Supabase Edge Functions trigger parallel research tasks (100 leads → <2 min).
CrewAI/LangGraph uses asyncio.gather + batch MCP calls. Sequential only for final drafting/review.

**Platform Operator Moat – “Quick-Start MCP” + UI Vibe**

One-click onboarding: User connects LinkedIn + website URL → agent auto-generates ICP (using Exa + your vertical templates) and populates first proposal template.
Dashboard: Linear-fast / Notion-clean. Default view = “Actions Pending Approval” carousel (leads to review, emails to approve, briefs ready). Settings hidden behind “Configure Agents”.

---

