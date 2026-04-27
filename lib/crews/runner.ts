/**
 * lib/crews/runner.ts
 *
 * Unified Crew Runner utility.
 * Instantiates and executes any crew (ProposalDrafterCrew, InboundLeadQualifierCrew, etc.)
 * Logs start/end to agent_audit_trail (agentic_ledger).
 * Compatible with both Next.js (Node) and Deno (Supabase Edge Functions).
 */

import type { ProposalDrafterCrew, ProposalInput } from './proposal-drafter';
import type { InboundLeadQualifierCrew, QualificationOutput } from './inbound-qualifier';
import type { LeadValidationCrew, ValidationOutput } from './lead-validation';
import type { ColdEmailPersonalizerCrew, ColdEmailInput, ColdPersonalizerOutput } from './cold-personalizer';

// Re-export types for convenience
export type { ProposalInput, QualificationOutput, ValidationOutput, ColdEmailInput, ColdPersonalizerOutput };

export type CrewType = 'proposal-drafter' | 'lead-qualifier' | 'lead-validation' | 'cold-personalizer';

export interface RunnerInput {
  crewType: CrewType;
  userId: string;
  payload: Record<string, any>;
}

export interface RunnerOutput {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Instantiate and run any crew via a unified interface.
 * Logs crew execution start/end to agent_audit_trail.
 */
export async function runCrew(input: RunnerInput): Promise<RunnerOutput> {
  const { crewType, userId, payload } = input;

  // Dynamic import to support Deno (Edge Functions) and Node (Next.js)
  try {
    // Log start
    await logToLedger(userId, crewType, 'crew_started', { payload });

    let result: any;

    switch (crewType) {
      case 'proposal-drafter': {
        const { ProposalDrafterCrew } = await import('./proposal-drafter');
        const crew = new ProposalDrafterCrew();
        const draftInput: ProposalInput = {
          user_id: userId,
          client_name: payload.client_name,
          project_title: payload.project_title,
          project_description: payload.project_description,
          filter: payload.filter,
        };
        const output = await crew.run(draftInput);
        result = output;
        break;
      }

      case 'lead-qualifier': {
        const { InboundLeadQualifierCrew } = await import('./inbound-qualifier');
        const crew = new InboundLeadQualifierCrew(userId);
        const qualification: QualificationOutput = await crew.run(
          payload.email,
          payload.companyName
        );
        result = qualification;
        break;
      }

      case 'lead-validation': {
        const { LeadValidationCrew } = await import('./lead-validation');
        const crew = new LeadValidationCrew(userId);
        const validation: ValidationOutput = await crew.run(payload.email);
        result = validation;
        break;
      }

      case 'cold-personalizer': {
        const { ColdEmailPersonalizerCrew } = await import('./cold-personalizer');
        const crew = new ColdEmailPersonalizerCrew(userId);
        const personalizerInput: ColdEmailInput[] = payload.leads || [payload];
        const output = await crew.run(personalizerInput, {
          batchSize: payload.batchSize,
          dryRun: payload.dryRun ?? true,
        });
        result = output;
        break;
      }

      default:
        throw new Error(`Unknown crew type: ${crewType}`);
    }

    // Log success
    await logToLedger(userId, crewType, 'crew_completed', {
      result: result.success ?? true,
      summary: summarizeResult(crewType, result),
    });

    return { success: true, result };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown crew error';

    await logToLedger(userId, crewType, 'crew_failed', {
      error: errorMessage,
      payload,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Log crew execution events to agent_audit_trail (agentic_ledger).
 * Works in both Node (Next.js) and Deno (Supabase Edge Functions).
 */
async function logToLedger(
  userId: string,
  crewType: CrewType,
  action: string,
  details: Record<string, any>
): Promise<void> {
  try {
    // Use dynamic import so this works in Deno Edge Functions
    // In Deno: import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
    // In Node/Next.js: import { createClient } from '@supabase/supabase-js'
    const isDeno = typeof Deno !== 'undefined';

    let createClient: any;
    let supabaseUrl: string;
    let supabaseKey: string;

    if (isDeno) {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2.42.0');
      createClient = mod.createClient;
      supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    } else {
      const mod = await import('@supabase/supabase-js');
      createClient = mod.createClient;
      supabaseUrl = process.env.SUPABASE_URL!;
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    }

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

function summarizeResult(crewType: CrewType, result: any): string {
  switch (crewType) {
    case 'proposal-drafter':
      return result.success ? `Draft created: ${result.draft?.title}` : `Draft failed: ${result.error}`;
    case 'lead-qualifier':
      return `Lead ${result.status}: score ${result.score}/100`;
    case 'lead-validation':
      return `Validation ${result.isValid ? 'passed' : 'failed'}: score ${result.score}/100`;
    case 'cold-personalizer':
      return `Personalized ${result.succeeded}/${result.total} emails`;
    default:
      return JSON.stringify(result).substring(0, 200);
  }
}
