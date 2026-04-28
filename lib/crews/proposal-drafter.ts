/**
 * lib/crews/proposal-drafter.ts
 *
 * Stub implementation of the ProposalDrafterCrew used by the runner.
 * Provides minimal types and a dummy `run` method that returns a success
 * payload compatible with the runner's expectations.
 */

export interface ProposalInput {
  user_id: string;
  client_name: string;
  project_title: string;
  project_description: string;
  filter?: Record<string, unknown>;
}

export interface ProposalResult {
  success: boolean;
  draft?: { title: string };
  error?: string;
}

export class ProposalDrafterCrew {
  // In a real implementation this would contain dependencies.
  async run(input: ProposalInput): Promise<ProposalResult> {
    // Return a simple deterministic stub.
    return {
      success: true,
      draft: { title: `${input.project_title} Draft` },
    };
  }
}
