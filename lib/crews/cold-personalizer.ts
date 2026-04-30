/**
 * lib/crews/cold-personalizer.ts
 *
 * Stub implementation of the ColdEmailPersonalizerCrew used by the runner.
 * Provides minimal types and a dummy `run` method that returns a success
 * payload compatible with the runner's expectations.
 */

export interface ColdEmailInput {
  email: string;
  name: string;
  company?: string;
}

export interface ColdPersonalizerOutput {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    email: string;
    personalized: boolean;
    subject?: string;
    body?: string;
  }>;
}

export class ColdEmailPersonalizerCrew {
  constructor(private userId: string) {}

  async run(
    leads: ColdEmailInput[]
  ): Promise<ColdPersonalizerOutput> {
    // Return a simple deterministic stub
    const results = leads.map((lead) => ({
      email: lead.email,
      personalized: true,
      subject: `Partnership opportunity with ${lead.company || 'your company'}`,
      body: `Hi ${lead.name}, ...`
    }));

    return {
      total: leads.length,
      succeeded: results.length,
      failed: 0,
      results
    };
  }
}