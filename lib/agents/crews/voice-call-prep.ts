/**
 * lib/agents/crews/voice-call-prep.ts
 *
 * Task 41: Voice/Call Prep Crew
 *
 * Pipeline:
 *   1. Takes an audio transcript (from MCP) and lead context.
 *   2. Generates a structured post-call brief including:
 *      - Summary
 *      - Objections raised
 *      - Next steps
 *
 * Security:
 *   - All actions logged to agent_audit_trail.
 */

import { getSupabaseServer } from '../../supabase/server';
import { logToAuditTrail } from '../utils';

export interface VoiceCallInput {
  lead_id: string;
  user_id: string;
  transcript: string;
}

export interface VoiceCallBrief {
  summary: string;
  objections: string[];
  next_steps: string[];
}

export interface VoiceCallPrepOutput {
  success: boolean;
  brief?: VoiceCallBrief;
  error?: string;
}

export class VoiceCallPrepCrew {
  /**
   * Generates a handoff-ready brief from a transcript.
   */
  async run(input: VoiceCallInput): Promise<VoiceCallPrepOutput> {
    try {
      console.log(`[VoiceCallPrepCrew] Processing transcript for lead ${input.lead_id}...`);

      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'voice_call_prep_crew',
        action: 'transcript_processing_started',
        details: { lead_id: input.lead_id, transcript_length: input.transcript.length },
      });

      // Simulated LLM Extraction logic
      const brief = this.extractInsights(input.transcript);

      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'voice_call_prep_crew',
        action: 'transcript_processing_completed',
        details: { lead_id: input.lead_id, brief_summary: brief.summary },
      });

      return {
        success: true,
        brief
      };

    } catch (err) {
      console.error('[VoiceCallPrepCrew] Run error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during transcript processing';
      
      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'voice_call_prep_crew',
        action: 'transcript_processing_failed',
        details: { lead_id: input.lead_id, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private extractInsights(transcript: string): VoiceCallBrief {
    // Simple deterministic fallback for dry-run/MVP
    const lowerTranscript = transcript.toLowerCase();
    
    const objections: string[] = [];
    if (lowerTranscript.includes('expensive') || lowerTranscript.includes('budget') || lowerTranscript.includes('cost')) {
      objections.push('Pricing/Budget concerns raised.');
    }
    if (lowerTranscript.includes('time') || lowerTranscript.includes('bandwidth')) {
      objections.push('Implementation time/Bandwidth constraints.');
    }
    if (objections.length === 0) {
      objections.push('No explicit objections detected.');
    }

    const next_steps: string[] = [];
    if (lowerTranscript.includes('proposal') || lowerTranscript.includes('contract')) {
      next_steps.push('Send formal proposal/contract.');
    }
    if (lowerTranscript.includes('meeting') || lowerTranscript.includes('demo') || lowerTranscript.includes('call')) {
      next_steps.push('Schedule follow-up demo/meeting.');
    }
    if (next_steps.length === 0) {
      next_steps.push('Follow up via email next week.');
    }

    return {
      summary: `Call processed. The prospect expressed interest and discussed their current setup. Length: ${transcript.split(' ').length} words.`,
      objections,
      next_steps
    };
  }
}
