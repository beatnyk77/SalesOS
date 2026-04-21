/**
 * lib/agents/crews/team-handoff.ts
 *
 * Task 42: Team Handoff Crew
 *
 * Pipeline:
 *   1. Takes a post-call brief (e.g., from VoiceCallPrepCrew).
 *   2. Extracts/infers specific next-step tasks for the team.
 *   3. Creates a structured handoff record in `team_handoffs`.
 *
 * Security:
 *   - All actions logged to agent_audit_trail.
 */

import { getSupabaseServer } from '../../supabase/server';
import { logToAuditTrail } from '../utils';
import { VoiceCallBrief } from './voice-call-prep';

export interface TeamHandoffInput {
  lead_id: string;
  user_id: string;
  brief: VoiceCallBrief;
}

export interface InternalTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TeamHandoffOutput {
  success: boolean;
  handoff_id?: string;
  tasks?: InternalTask[];
  error?: string;
}

export class TeamHandoffCrew {
  async run(input: TeamHandoffInput): Promise<TeamHandoffOutput> {
    try {
      console.log(`[TeamHandoffCrew] Generating handoff for lead ${input.lead_id}...`);

      const supabase = getSupabaseServer();

      // 1. Generate Tasks from the Brief
      const tasks = this.generateTasks(input.brief);

      // 2. Insert into team_handoffs table
      const { data: handoff, error: insertError } = await supabase
        .from('team_handoffs')
        .insert({
          user_id: input.user_id,
          lead_id: input.lead_id,
          brief: input.brief,
          tasks: tasks,
          status: 'open'
        })
        .select()
        .single();

      if (insertError || !handoff) {
        throw new Error(`Failed to create handoff: ${insertError?.message}`);
      }

      // 3. Log to Audit Trail
      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'team_handoff_crew',
        action: 'handoff_created',
        details: { 
          lead_id: input.lead_id, 
          handoff_id: handoff.id,
          task_count: tasks.length 
        },
      });

      return {
        success: true,
        handoff_id: handoff.id,
        tasks
      };

    } catch (err) {
      console.error('[TeamHandoffCrew] Run error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during handoff generation';
      
      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'team_handoff_crew',
        action: 'handoff_failed',
        details: { lead_id: input.lead_id, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private generateTasks(brief: VoiceCallBrief): InternalTask[] {
    const tasks: InternalTask[] = [];

    // Analyze next steps
    brief.next_steps.forEach(step => {
      const lowerStep = step.toLowerCase();
      if (lowerStep.includes('proposal') || lowerStep.includes('contract')) {
        tasks.push({
          title: 'Draft & Send Proposal',
          description: `Prepare proposal. Note objections: ${brief.objections.join('; ')}`,
          priority: 'high'
        });
      } else if (lowerStep.includes('meeting') || lowerStep.includes('demo') || lowerStep.includes('call')) {
        tasks.push({
          title: 'Schedule Follow-up Demo',
          description: 'Coordinate a time for the technical deep-dive.',
          priority: 'high'
        });
      } else {
        tasks.push({
          title: 'General Follow-up',
          description: step,
          priority: 'medium'
        });
      }
    });

    // Handle unresolved objections
    if (brief.objections.some(o => o.toLowerCase().includes('budget') || o.toLowerCase().includes('pricing'))) {
      tasks.push({
        title: 'Prepare ROI/Pricing Justification',
        description: 'Prospect has budget concerns. Assemble case studies focused on ROI.',
        priority: 'medium'
      });
    }

    // Default fallback task if nothing was added
    if (tasks.length === 0) {
      tasks.push({
        title: 'Review Call Transcript',
        description: 'Review the recent call to determine next actions.',
        priority: 'low'
      });
    }

    return tasks;
  }
}
