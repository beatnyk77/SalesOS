export interface Log {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  outcome: 'VALIDATED' | 'REJECTED';
  details: {
    linkedinUrl?: string;
    score?: number;
    isActive?: boolean;
    profileQuality?: number;
    costSaved?: number;
    linkedInQualityScore?: number;
    exaSearchDepth?: number;
    researchSources?: any[];
    reasoning?: string;
  };
  costSaved?: number;
}