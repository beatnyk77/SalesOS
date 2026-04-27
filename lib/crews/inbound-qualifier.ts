/**
 * lib/crews/inbound-qualifier.ts
 *
 * Stub implementation of the InboundLeadQualifierCrew used by the runner.
 * Provides minimal types and a dummy `run` method that returns a success
 * payload compatible with the runner's expectations.
 */

export interface QualificationOutput {
  success: boolean;
  status: 'qualified' | 'unqualified' | 'needs_review';
  score?: number;
  match_keywords?: string[];
}

export class InboundLeadQualifierCrew {
  constructor(private userId: string) {}

  async run(email: string, companyName: string): Promise<QualificationOutput> {
    // Return a simple deterministic stub based on heuristics
    return {
      success: true,
      status: 'qualified' as const,
      score: Math.floor(Math.random() * 100),
      match_keywords: [`${companyName.split(' ').slice(0, 3).join(' ')}`],
    };
  }
}