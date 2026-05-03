import { createClient } from '@supabase/supabase-js';

export interface QualificationOutput {
  success: boolean;
  status: 'qualified' | 'rejected' | 'needs_review';
  score: number;
  reasoning: string;
  researchData?: Record<string, unknown>;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export class InboundLeadQualifierCrew {
  constructor(private userId: string) {}

  async run(email: string, companyName: string): Promise<QualificationOutput> {
    const supabase = getSupabaseAdmin();

    try {
      // Stage 1 — Email validation (ghost-lead gate)
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        'validate-email',
        { body: { email, user_id: this.userId } }
      );

      if (validationError) throw new Error(`Email validation failed: ${validationError.message}`);

      if (validationData?.outcome === 'REJECTED') {
        return {
          success: true,
          status: 'rejected',
          score: validationData.score ?? 0,
          reasoning: `Lead rejected at email validation stage. Score: ${validationData.score}/100. Status: ${validationData.hunter_status}.`,
        };
      }

      // Stage 2 — Company research via Exa
      const { data: researchData, error: researchError } = await supabase.functions.invoke(
        'research-company',
        { body: { company_name: companyName || email.split('@')[1], user_id: this.userId } }
      );

      if (researchError) throw new Error(`Company research failed: ${researchError.message}`);
      if (!researchData?.success) throw new Error('Research returned no data.');

      const profile = researchData.data as Record<string, unknown>;

      // Stage 3 — ICP scoring via OpenAI
      const { data: icpCriteria } = await supabase
        .from('icp_criteria')
        .select('id, name, description, metadata')
        .eq('user_id', this.userId)
        .limit(5);

      const { data: scoreData, error: scoreError } = await supabase.functions.invoke('score-lead', {
        body: {
          lead_data: profile,
          icp_criteria: icpCriteria ?? [],
          user_id: this.userId,
        },
      });

      if (scoreError) throw new Error(`Lead scoring failed: ${scoreError.message}`);
      if (!scoreData?.success) throw new Error(`Scoring error: ${scoreData?.error}`);

      const status: QualificationOutput['status'] =
        scoreData.status === 'qualified'
          ? 'qualified'
          : scoreData.status === 'rejected'
          ? 'rejected'
          : 'needs_review';

      // Persist lead record
      await supabase.from('leads').upsert(
        {
          user_id: this.userId,
          email,
          company_name: companyName || (profile.company as string) || email.split('@')[1],
          status,
          score: scoreData.score,
          summary: scoreData.reasoning,
          research_payload: profile,
          icp_matching_notes:
            (icpCriteria ?? []).length > 0
              ? `Scored against ${icpCriteria!.length} ICP criteria.`
              : 'No ICP criteria on file — used general heuristics.',
        },
        { onConflict: 'user_id,email' }
      );

      // Audit log
      await supabase.from('agent_audit_trail').insert({
        user_id: this.userId,
        agent_name: 'Inbound Lead Qualifier Crew',
        action: 'lead_qualified',
        details: {
          email,
          score: scoreData.score,
          status,
          reasoning: scoreData.reasoning,
          icp_matched_count: (icpCriteria ?? []).length,
          is_mock: researchData.is_mock ?? false,
        },
      });

      return {
        success: true,
        status,
        score: scoreData.score,
        reasoning: scoreData.reasoning,
        researchData: profile,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await supabase.from('agent_audit_trail').insert({
        user_id: this.userId,
        agent_name: 'Inbound Lead Qualifier Crew',
        action: 'qualification_failed',
        details: { email, error: message },
      });

      return {
        success: false,
        status: 'needs_review',
        score: 0,
        reasoning: `Qualification failed: ${message}`,
      };
    }
  }
}
