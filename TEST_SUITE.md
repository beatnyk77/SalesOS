# SalesOS MVP Test Suite (TestSprite)

This document contains the verification prompts for TestSprite to validate the MVP features of SalesOS.

## Feature 1: Inbound Lead Qualification
**Prompt:** 
"Submit a new lead with email 'test@example.com' and company 'Stripe'. 
Verify that:
1. The lead is ingested into the `leads` table.
2. The `trigger-lead-qualifier` Edge Function is invoked.
3. Research is performed via Exa and a summary is generated.
4. The lead status is updated to 'qualified' or 'rejected' based on the score.
5. An audit entry is created in `agent_audit_trail`."

## Feature 2: Human-in-the-Loop (HITL) Approval
**Prompt:**
"Verify the email approval flow:
1. Identify a cold email with status 'pending_approval'.
2. Use the `/dashboard/agents/cold-emails` interface to edit and approve the email.
3. Verify the email status changes to 'sent'.
4. Ensure the 'sent' action is recorded in the `agent_audit_trail` with the user ID."

## Feature 3: Personalization Engine
**Prompt:**
"Run the `cold-personalizer` crew on a qualified lead.
Verify that:
1. The generated email body contains project-specific details and a personalized hook.
2. The tone matches the 'Institutional but helpful' persona defined in the PRD.
3. Multiple drafts are saved if requested, or the single high-fidelity draft is persisted."

## Feature 4: Automated Proposals
**Prompt:**
"Draft a proposal for a 'Software Implementation' project for 'Acme Corp' (Industry: Technology, Budget: $50k).
Verify that:
1. The `proposal-rag` module filters for the correct technology/implementation template.
2. The output correctly replaces `{{client_name}}` and `{{project_title}}`.
3. The proposal draft is editable in the UI and saves correctly to the audit ledger."

## Feature 5: Pipeline Monitor
**Prompt:**
"Manually invoke the `pipeline-monitor` Edge Function.
Verify that:
1. Leads older than 3 days without status changes are flagged.
2. Emails pending for >3 days are identified as risks.
3. Risk entries are created in the `agent_audit_trail`."
