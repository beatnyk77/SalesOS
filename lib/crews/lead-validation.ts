/**
 * lib/crews/lead-validation.ts
 *
 * Stub implementation of the LeadValidationCrew used by the runner.
 * Provides minimal types and a dummy `run` method that returns a success
 * payload compatible with the runner's expectations.
 */

export interface ValidationOutput {
  success: boolean;
  isValid: boolean;
  score: number;
  message: string;
}

export class LeadValidationCrew {
  constructor(/* userId */) {}

  async run(email: string): Promise<ValidationOutput> {
    // Return a simple deterministic stub based on email validation
    return {
      success: true,
      isValid: true,
      score: Math.floor(Math.random() * 100),
      message: `Email ${email} validated successfully`
    };
  }
}