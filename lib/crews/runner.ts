/**
 * lib/crews/runner.ts
 *
 * Unified Crew Runner utility.
 * Instantiates and executes any crew (ProposalDrafterCrew, InboundLeadQualifierCrew, etc.)
 * Logs start/end to agent_audit_trail (agentic_ledger).
 * Compatible with both Next.js (Node) and Deno (Supabase Edge Functions).
 */

import type { ProposalInput } from './proposal-drafter';
import type { QualificationOutput } from './inbound-qualifier';
import type { ValidationOutput } from './lead-validation';
import type { ColdEmailInput, ColdPersonalizerOutput } from './cold-personalizer';

// Re-export types for convenience
export type { ProposalInput, QualificationOutput, ValidationOutput, ColdEmailInput, ColdPersonalizerOutput };

export type CrewType = 'proposal-drafter' | 'lead-qualifier' | 'lead-validation' | 'cold-personalizer';

export interface RunnerInput {
  crewType: CrewType;
  userId: string;
  payload: Record<string, unknown>;
}

export interface RunnerOutput {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Instantiate and run any crew via a unified interface.
 * Logs crew execution start/end to agent_audit_trail.
 */
export async function runCrew(input: RunnerInput): Promise<RunnerOutput> {
  const { crewType, userId, payload } = input;

  // Log start
  await logToLedger(userId, crewType, 'crew_started', { payload });

  let result: unknown;

  switch (crewType) {
    case 'proposal-drafter': {
      const { ProposalDrafterCrew } = await import('./proposal-drafter');
      const crew = new ProposalDrafterCrew();
      const draftInput: ProposalInput = {
        user_id: userId,
        client_name: payload.client_name as string,
        project_title: payload.project_title as string,
        project_description: payload.project_description as string,
        filter: payload.filter as ProposalInput['filter'],
      };
      const output = await crew.run(draftInput);
      result = output;
      break;
    }

    case 'lead-qualifier': {
      const { InboundLeadQualifierCrew } = await import('./inbound-qualifier');
      const crew = new InboundLeadQualifierCrew(userId);
      const qualification: QualificationOutput = await crew.run(
        payload.email as string,
        payload.companyName as string
      );
      result = qualification;
      break;
    }

    case 'lead-validation': {
      const { LeadValidationCrew } = await import('./lead-validation');
      const crew = new LeadValidationCrew(userId);
      const validation: ValidationOutput = await crew.run(payload.email as string);
      result = validation;
      break;
    }

    case 'cold-personalizer': {
      const { ColdEmailPersonalizerCrew } = await import('./cold-personalizer');
      const crew = new ColdEmailPersonalizerCrew(userId);
      const personalizerInput: ColdEmailInput[] = (payload.leads as unknown as ColdEmailInput[]) || [(payload as unknown as ColdEmailInput)];
      const output = await crew.run(personalizerInput);
      result = output;
      break;
    }

    default:
      throw new Error(`Unknown crew type: ${crewType}`);
  }

  // Log success
  await logToLedger(userId, crewType, 'crew_completed', {
    result: (result as { success?: boolean }).success ?? true,
    summary: summarizeResult(crewType, result),
  });

  return { success: true, result };
}

/**
 * Log crew execution events to agent_audit_trail (agentic_ledger).
 * Works in both Node (Next.js) and Deno (Supabase Edge Functions).
 */
async function logToLedger(
  userId: string,
  crewType: CrewType,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('agent_audit_trail').insert({
      user_id: userId,
      agent_name: crewType,
      action,
      details,
    });
  } catch (logErr) {
    console.error('[runner] Failed to log to audit trail:', logErr);
  }
}

function summarizeResult(crewType: CrewType, result: unknown): string {
    switch (crewType) {
      case 'proposal-drafter': {
        const r = result as { success?: boolean; draft?: { title?: string }; error?: string };
        return r.success ? `Draft created: ${r.draft?.title}` : `Draft failed: ${r.error}`;
      }
      case 'lead-qualifier': {
        const r = result as { status?: string; score?: number };
        return `Lead ${r.status}: score ${r.score}/100`;
      }
      case 'lead-validation': {
        const r = result as { isValid?: boolean; score?: number };
        return `Validation ${r.isValid ? 'passed' : 'failed'}: score ${r.score}/100`;
      }
      case 'cold-personalizer': {
        const r = result as { succeeded?: number; total?: number };
        return `Personalized ${r.succeeded}/${r.total} emails`;
      }
      default:
        return JSON.stringify(result).substring(0, 200);
    }
}