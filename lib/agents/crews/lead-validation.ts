import { getSupabaseServer } from '@/lib/supabase/server';
import { logToAuditTrail } from '../utils';

export interface ValidationOutput {
  isValid: boolean;
  score: number;
  reasoning: string;
  metadata: {
    isDisposable: boolean;
    hunterStatus: string;
  };
}

/**
 * Lead Validation Crew
 * 
 * This crew is responsible for the initial filtering of leads to prevent "ghost" or 
 * low-quality leads from entering the expensive research pipeline.
 * 
 * Orchestration:
 * - Agent: Validation Officer (calls validate-email Edge Function)
 * - Process: Sequential (current version is a single-step validation)
 * - Output: Structured ValidationOutput (Pydantic-style interface)
 */
export class LeadValidationCrew {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Executes the validation process for a given lead email.
   * @param email The email address to validate.
   * @returns A promise resolving to the structured validation result.
   */
  async run(email: string): Promise<ValidationOutput> {
    const supabase = getSupabaseServer();

    try {
      // 1. Invoke the Edge Function (Agent: Validation Officer)
      // This is a sandboxed call that handles the Hunter API (or mock)
      const { data, error } = await supabase.functions.invoke('validate-email', {
        body: { 
          email, 
          user_id: this.userId 
        }
      });

      if (error) {
        throw new Error(`Edge Function invocation failed: ${error.message}`);
      }

      const { success, score, outcome, is_disposable, hunter_status } = data;

      if (!success) {
        throw new Error(data.error || "Unknown validation error");
      }

      // 2. Map response to structured output (Pydantic-style)
      const output: ValidationOutput = {
        isValid: outcome === 'VALIDATED',
        score: score,
        reasoning: outcome === 'REJECTED'
          ? `Lead rejected by validation agent. Reason: ${is_disposable ? 'Disposable email' : 'Low confidence score (' + score + ')'}.`
          : `Lead accepted. High confidence validation score: ${score}.`,
        metadata: {
          isDisposable: is_disposable,
          hunterStatus: hunter_status
        }
      };

      // 3. Log Crew Completion to Audit Trail
      await logToAuditTrail({
        userId: this.userId,
        agentName: 'Lead Validation Crew',
        action: 'crew_execution_completed',
        details: {
          email,
          output
        }
      });

      return output;

    } catch (error: any) {
      // Log failure to audit trail
      await logToAuditTrail({
        userId: this.userId,
        agentName: 'Lead Validation Crew',
        action: 'crew_execution_failed',
        details: {
          email,
          error: error.message
        }
      });

      throw error;
    }
  }
}
