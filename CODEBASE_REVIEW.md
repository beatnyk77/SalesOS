# SalesOS Codebase Review & Commercialization Roadmap

**Date:** May 2, 2026  
**Status:** Beta v0.1.0 — Foundation solid, critical gaps prevent go-live  
**Aspiration:** SMB SaaS ($39–$249/mo, 50 beta users in 60 days, $10k MRR in 4 months)

---

## 🟢 What Works Well

### 1. **Architecture Foundation (Solid)**
- ✅ **Supabase choice is excellent**: Postgres + Auth + Edge Functions + Realtime + pgvector = single pane of glass for MVP.
- ✅ **RLS + pgvector + metadata filtering**: Database schema prevents cross-tenant data leakage (critical for multi-tenant SaaS).
- ✅ **Clean crew runner pattern** (`lib/crews/runner.ts`): Unified interface for all agent orchestration. Automatically logs to audit trail.
- ✅ **Lead qualification pipeline** (`trigger-lead-qualifier`): Well-designed 3-stage orchestration (email validation → company research → ICP scoring) with idempotency, webhook authentication, and structured error handling.
- ✅ **Human-in-the-loop (HITL) intent**: Dashboard supports "Actions Pending Approval" carousel. Dry-run mode is a strong safety feature.
- ✅ **Cost guardrails framework**: `_shared/cost-guard.ts` provides budget checking. Ready for production use.

### 2. **Database & Security (Excellent)**
- ✅ **Agent Audit Trail**: Immutable ledger table (`agent_audit_trail`) logs every decision with full context. **This is your trust signal & fine-tuning goldmine.**
- ✅ **Metadata RAG filtering**: Proposal/ICP templates are tagged and queried with JSONB containment (`metadata @>`) — prevents template bleeding across industries/customers.
- ✅ **Per-user budget enforcement**: `user_budgets` table + RPC for token usage. Prevents runaway costs.
- ✅ **RLS on all tables**: Every table enforces `auth.uid() = user_id`. Supabase handles token expiry.

### 3. **DevOps & Deployment (Professional)**
- ✅ **CI/CD pipeline** (`.github/workflows/ci-cd.yml`): Lint → Build → Migrate DB → Deploy Vercel + Edge Functions. Handles generated file auto-commits.
- ✅ **Edge Function deployment strategy**: Correct understanding that functions must deploy **one at a time** (not all together).
- ✅ **Environment variable management**: Secrets properly scoped per env. Vercel integration ready.
- ✅ **TypeScript throughout**: Strict mode enabled. Type safety across crew inputs/outputs.

### 4. **UI/UX Intent (Clear)**
- ✅ **Terminal aesthetic**: Dark theme (black/zinc-950), minimal, fast. Linear/Notion vibe resonates with SMBs.
- ✅ **Navigation sidebar**: 11 routes planned (Leads, Proposals, Closing, Handoffs, WhatsApp, Collateral, Settings, etc.). Ambitious but organized.
- ✅ **Realtime updates**: `useRealtimeUpdates` hook + Supabase Realtime channel keeps UI in sync when agents finish.
- ✅ **Settings + Quick-Start**: One-click ICP generation and collateral upload on roadmap.

---

## 🔴 Critical Gaps (Blocks Go-Live)

### 1. **Agent Crews Are Stubs, Not Functional** ⚠️ **BLOCKING**
**Status:** Crew files exist but return mock/deterministic outputs.

**Impact:** Your agents don't actually think, research, or personalize. Tests will show "success" but no real value.

- `lib/crews/inbound-qualifier.ts`: Returns random score (0–100), not real ICP matching.
- `lib/crews/cold-personalizer.ts`: Returns boilerplate `"Hi {name}, ..."` — zero research, zero personalization.
- `lib/crews/proposal-drafter.ts`: Likely stub (need to verify).
- `lib/crews/lead-validation.ts`: Ghost-lead validation is not real.

**What's needed:**
- Replace with **real LangGraph agents** that call MCP tools (Exa, Hunter, OpenAI).
- Use structured outputs (Pydantic) for type safety.
- Test end-to-end: CSV upload → research → personalization → draft → audit trail.

**Effort:** ~120–160 hours (4–5 sprints per crew, 4 crews = 16–20 sprints total). This is **the biggest blocker**.

---

### 2. **Missing LLM Layer** ⚠️ **BLOCKING**
**Status:** Dependencies listed (`crewai`, `langgraph`) but no actual LLM calls in the codebase.

**Impact:** No reasoning, no intelligent filtering, no personalization.

**Where it's missing:**
- `score-lead` function: Uses heuristics (string matching for "software", "series a", "50-200 employees") instead of semantic understanding via LLM.
- `cold-personalizer` crew: No research step, no context window, no LLM call.
- `proposal-drafter` crew: No template selection reasoning, no client context injection.
- Edge Functions have no OpenAI/Anthropic imports.

**What's needed:**
- Add OpenAI or Anthropic SDK to `package.json`.
- Create wrapper functions in `lib/agents/` for common LLM patterns (scoring, reasoning, drafting).
- Use structured outputs (`gpt-4o-mini` for cost, `gpt-4o` for quality).
- Stream responses where appropriate (emails, proposals).

**Effort:** ~40–60 hours (core wrapper library, integration across 4 crews).

---

### 3. **MCP Tool Integration Missing** ⚠️ **BLOCKING**
**Status:** `antigravity/mcp-config.json` exists but is not integrated into crew code.

**Impact:** Agents can't research (Exa), validate emails (Hunter), or interact with CRM (HubSpot).

**What's needed:**
- Implement MCP client calls in each crew (can use HTTP or Anthropic SDK's tool_use).
- Example: Exa for company research → latest news, funding, tech stack.
- Example: Hunter for email validation → deliverability score, domain reputation.
- Test with real API keys (or mock in dev).

**Effort:** ~60–80 hours (one crew at a time, test each).

---

### 4. **Dashboard Features Are Page Stubs** ⚠️ **MEDIUM**
**Status:** All `/dashboard/*` routes have pages but most are empty or `Client` components with placeholder code.

**Impact:** Users land on blank pages. No ability to:
- View/manage leads
- Approve cold emails
- Draft proposals
- Monitor pipeline health
- Configure ICP

**What exists:**
- `page.tsx` files and layout scaffolding.
- `DashboardClient.tsx` carousel (shows pending actions).
- `Sidebar.tsx` navigation.

**What's missing:**
- `LeadsClient.tsx`: Full CRUD for leads table (filter, sort, bulk actions).
- `ProposalsClient.tsx`: Draft editor + version control.
- `SettingsClient.tsx`: ICP builder, collateral upload, agent settings.
- `ProspectsClient.tsx`: CSV parser + bulk upload trigger.
- All Client components need wiring to Server Actions and realtime subscriptions.

**Effort:** ~60–80 hours (5–8 hours per feature).

---

### 5. **Email & CRM Integration Incomplete** ⚠️ **HIGH**
**Status:** HubSpot MCP listed, but no send logic, no Gmail integration, no CRM write-back.

**Impact:** Users can approve an email but it never sends. No lead routing to CRM. No deal tracking.

**What's needed:**
- Gmail MCP integration: `sendEmail(to, subject, body)` in a Server Action.
- HubSpot MCP integration: Create contact, create deal, update pipeline stage.
- WhatsApp integration (`whatsapp_messages` table exists but no send logic).
- Test email delivery + MCP error handling.

**Effort:** ~40 hours.

---

### 6. **No Tests** ⚠️ **MEDIUM**
**Status:** `TEST_SUITE.md` describes what *should* be tested, but no test files exist.

**Impact:** Refactoring is risky. Regressions go unnoticed. Can't ship with confidence.

**What's needed:**
- Unit tests for crew runners (`lib/crews/runner.test.ts`).
- Integration tests for Edge Functions (`supabase/functions/*/test.ts`).
- E2E tests for lead qualification flow (TestSprite or Playwright).
- At least 60% code coverage before go-live.

**Effort:** ~40–60 hours.

---

### 7. **Data Migration & Seed Data Strategy Missing** ⚠️ **MEDIUM**
**Status:** Migrations exist but no seeding strategy for demo/test data.

**Impact:** New users land on empty dashboard. No "aha moment" unless they upload a CSV and wait 30 seconds for agents to run.

**What's needed:**
- Seed templates (3 vertical templates: Agencies, SaaS, Consulting).
- Demo ICP profiles.
- Demo leads (qualified + rejected) to show audit trail.
- One-click "Load Demo Data" in settings.

**Effort:** ~20 hours.

---

### 8. **Billing & Metering Not Implemented** ⚠️ **BLOCKS COMMERCIALIZATION**
**Status:** `user_budgets` table exists but no checkout, no invoice generation, no payment integration.

**Impact:** Can't charge users. Can't go to production without revenue model.

**What's needed:**
- Stripe integration (`@stripe/stripe-js`, `@stripe/stripe-node`).
- Pricing tiers: Starter ($39/mo, 100 actions), Pro ($99/mo, 500 actions), Enterprise (custom).
- Checkout page (Stripe Checkout or custom form).
- Webhook handler for payment status (succeed, fail, refund).
- Usage meter → invoice generation (Stripe Billing).
- Email receipts + invoice portal.

**Effort:** ~80–120 hours (includes Stripe setup, testing, legal terms).

---

### 9. **Onboarding & Auth Incomplete** ⚠️ **MEDIUM**
**Status:** `/login` and `/signup` pages exist but signup flow doesn't exist.

**Impact:** Users can't register. No email verification. No onboarding checklist.

**What's needed:**
- Supabase Auth sign-up (email + password or OAuth).
- Email verification link.
- Post-signup: onboarding modal with quick-start steps (ICP → templates → CSV upload).
- Auth middleware on all `/dashboard` routes (already exists in layout, good).

**Effort:** ~20–30 hours.

---

### 10. **Documentation & Runbook for Deployers** ⚠️ **MEDIUM**
**Status:** `GETTING-STARTED.md` and `README.md` exist but assume too much technical knowledge.

**Impact:** Non-technical founders can't self-serve deployment.

**What's needed:**
- Step-by-step video walkthrough (3 minutes).
- One-click Supabase deploy button.
- Vercel deploy template.
- Troubleshooting section (MCP errors, rate limits, CORS).

**Effort:** ~10 hours (documentation + video).

---

## 🟡 Technical Debt & Improvements

### Medium Priority (Fix Before Go-Live)

1. **Error Handling in Edge Functions**: Many functions return 500 on edge case errors. Add defensive checks and clear error messages.
2. **Logging Strategy**: `console.error` everywhere. Move to structured logging (Supabase logs + Datadog/Sentry).
3. **Rate Limiting**: No protection against abuse. Add Supabase rate limiting or Cloudflare.
4. **CORS Hardening**: `'Access-Control-Allow-Origin': '*'` in Edge Functions is too permissive. Restrict to your domain.
5. **Input Validation**: Request payloads validated in `trigger-lead-qualifier` but not in others. Standardize.
6. **API Documentation**: No OpenAPI/Swagger docs for Edge Functions. Add for third-party webhooks.

### Low Priority (Post-Launch)

1. **Performance**: No caching strategy for Exa/HubSpot responses. Add Redis/Supabase cache layer.
2. **Analytics**: No event tracking for user actions. Add PostHog or Plausible.
3. **Notifications**: SMS/Slack alerts for important events (agent errors, approvals needed). Add Twilio.
4. **Multi-language/Multi-currency**: Not needed for MVP.

---

## 📊 Current State Assessment

| Component | Status | Blockers | Effort (hrs) |
|-----------|--------|----------|--------------|
| **Architecture** | ✅ Solid | None | 0 |
| **Database** | ✅ Solid | None | 0 |
| **Auth** | 🟡 Partial | signup flow | 20 |
| **Agent Crews** | 🔴 Stubs | Real LLM + MCP | 200 |
| **Dashboard UI** | 🟡 Partial | Client components | 80 |
| **Email/CRM** | 🔴 Missing | MCP integration | 40 |
| **Testing** | 🔴 None | Unit + E2E | 50 |
| **Billing** | 🔴 Missing | Stripe setup | 100 |
| **Onboarding** | 🟡 Partial | signup → quick-start | 25 |
| **Docs** | 🟡 Partial | video + deploy buttons | 10 |
| **Subtotal** | | | **525 hours** |

**Time Estimate: 13 weeks @ 40 hrs/week, or 6.5 weeks @ 80 hrs/week (crunch mode).**

---

## 🚀 Path to Commercialization (60-Day Sprint)

### Week 1–2: Foundation (60 hrs)
- [ ] Implement real LLM wrapper library (OpenAI `gpt-4o-mini`).
- [ ] Wire up Exa MCP to `research-company` function.
- [ ] Wire up Hunter MCP to `validate-email` function.
- [ ] Add structured output validation.

### Week 3–4: Agent Intelligence (80 hrs)
- [ ] Build real `InboundLeadQualifierCrew` (Exa research → scoring).
- [ ] Build real `ColdPersonalizerCrew` (research → hook generation → email draft).
- [ ] Write unit tests for each crew.
- [ ] Test with real leads (internal team).

### Week 5–6: UI & Dashboard (80 hrs)
- [ ] Complete `LeadsClient.tsx` (CRUD, realtime sync, bulk actions).
- [ ] Complete `SettingsClient.tsx` (ICP builder, collateral upload).
- [ ] Complete `ProposalsClient.tsx` (draft editor).
- [ ] Wire all to realtime updates + server actions.

### Week 7: Billing & Commercialization (60 hrs)
- [ ] Add Stripe integration (checkout, webhooks, metering).
- [ ] Implement pricing tiers + usage limits.
- [ ] Create billing dashboard (invoices, usage, upgrade).
- [ ] Write billing terms + privacy policy.

### Week 8: Go-Live Prep (40 hrs)
- [ ] Fix error handling + CORS issues.
- [ ] Write E2E tests (Playwright).
- [ ] Create deployment runbook + onboarding video.
- [ ] Performance tuning (cache, query optimization).
- [ ] Soft launch with 5–10 internal beta users.

### Week 9–10: Beta Feedback & Polish (40 hrs)
- [ ] Gather feedback from internal beta.
- [ ] Fix regressions + polish UX.
- [ ] Add monitoring (Datadog/Sentry).
- [ ] Launch to 50 beta users.

---

## 💰 Commercialization Strategy

### Pricing Model (Recommended)

| Plan | Price | Actions/mo | Features |
|------|-------|-----------|----------|
| **Starter** | $39 | 100 | Inbound Qualifier, Email Validation |
| **Pro** | $99 | 500 | + Cold Personalizer, Proposal Drafter, Pipeline Monitor |
| **Enterprise** | Custom | Unlimited | + Dedicated support, custom integrations, SOC 2 |

**Target:** 50 paying users ($39) → $1,950 MRR by month 2. 40 Pro → $3,960 MRR. Total $10k MRR by month 4 (realistic).

### Go-To-Market (60 Days)

1. **Weeks 1–4:** Internal beta (your team + 5 advisors). Iterate on core flows.
2. **Weeks 5–6:** Product Hunt launch + Twitter/LinkedIn outreach.
3. **Weeks 7–8:** 50 beta users (free tier).
4. **Week 9–10:** Convert 10–20 to paid. Hit $2–4k MRR.

### Support & Success
- Email support only (leverage AI for tier-1 responses).
- Slack community for users.
- Weekly office hours (demo + Q&A).
- Video tutorials for each feature.

---

## 🎯 Immediate Next Steps (This Week)

1. **Decide on crew implementation strategy**: Start with InboundLeadQualifierCrew + test with real leads.
2. **Get MCP tools working**: Exa + Hunter should return real data by EOW.
3. **Pick one dashboard feature**: Complete LeadsClient fully (shows you're serious).
4. **Rough out billing**: Decision on Stripe vs custom + pricing model.
5. **Schedule beta user interviews**: Talk to 3–5 potential SMB customers about pain points.

---

## ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Agent hallucinations (bad lead scoring) | High | Medium | HITL approval gate + audit trail logging |
| MCP API failures (Exa rate limit) | Medium | High | Fallback scoring + graceful degradation |
| Churn from poor UX | High | High | Focus on onboarding + quick wins |
| Stripe integration complexity | Medium | Medium | Use pre-built Supabase + Stripe repo |
| Slow deployments (CI/CD lag) | Low | Medium | Parallel Edge Function deploys or n8n |

---

## Summary

**The Good:** Your architecture, database design, and deployment pipeline are production-ready. You've thought through security, multi-tenancy, and human oversight.

**The Bad:** Your agents are stubs, your UI is incomplete, and you have no billing. These are fixable in 8–10 weeks of focused development.

**The Path:** Prioritize **agent intelligence** (weeks 1–4), then **UI completeness** (weeks 5–6), then **billing** (week 7). You can soft-launch to beta users at week 8 and hit $10k MRR by month 4 if execution is tight.

**Go build. The foundation is solid.**
