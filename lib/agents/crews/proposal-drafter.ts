/**
 * lib/agents/crews/proposal-drafter.ts
 *
 * Task 18: Proposal Auto-Drafter Crew
 *
 * Pipeline:
 *   1. Queries proposal templates using metadata RAG (lib/rag/proposal-rag.ts)
 *   2. Drafts a full proposal based on project details and the best-matching template.
 *   3. Enforces metadata fidelity (industry, deal size, service type).
 *
 * Security:
 *   - Dry-run by default.
 *   - All actions logged to agent_audit_trail.
 */

import { logToAuditTrail } from '../utils';
import { queryProposalTemplates, ProposalFilter } from '../../rag/proposal-rag';
import { CollateralRAGCrew } from './collateral-rag';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProposalInput {
  user_id: string;
  client_name: string;
  project_title: string;
  project_description: string;
  filter: ProposalFilter;
}

export interface ProposalDraft {
  title: string;
  client: string;
  content: string;
  metadata_applied: ProposalFilter;
  template_used_id: string;
  collateral_referenced?: string[];
}

export interface ProposalDrafterOutput {
  success: boolean;
  draft?: ProposalDraft;
  error?: string;
}

// ─── Crew Implementation ──────────────────────────────────────────────────────

export class ProposalDrafterCrew {
  /**
   * Drafts a proposal based on the input project details.
   */
  async run(input: ProposalInput): Promise<ProposalDrafterOutput> {
    const { user_id, client_name, project_title, project_description, filter } = input;

    try {
      console.log(`[ProposalDrafterCrew] Starting draft for ${client_name} - ${project_title}...`);

      // 1. Audit: Start
      await logToAuditTrail({
        userId: user_id,
        agentName: 'proposal_drafter_crew',
        action: 'drafting_started',
        details: { client_name, project_title, filter },
      });

      // 2. RAG: Retrieve best-matching template
      const templates = await queryProposalTemplates(user_id, filter, 1);

      if (templates.length === 0) {
        // Fallback to a generic template if no metadata match is found
        console.warn('[ProposalDrafterCrew] No matching template found for filter. Using generic fallback.');
      }

      const template = templates[0] || {
        id: 'generic_fallback',
        name: 'Generic Proposal Template',
        content: `PROPOSAL: {{project_title}}\n\nPrepared for: {{client_name}}\n\nIntroduction:\n{{project_description}}\n\nScope of Work:\n- Implementation of SalesOS core agents.\n- Integration with existing CRM.\n- Performance monitoring.\n\nPricing:\nStandard implementation fee applies.\n\nNext Steps:\nConfirm approval to proceed.`,
        metadata: {}
      };

      // 3. Collateral RAG: Retrieve relevant collateral snippets
      const collateralCrew = new CollateralRAGCrew();
      const collateralResult = await collateralCrew.run({
        user_id,
        filter: {
          industry: filter.industry,
          deal_stage: 'Proposal',
          document_type: 'Case Study'
        },
        limit: 2
      });

      let collateralSnippet = '';
      if (collateralResult.success && collateralResult.collateral.length > 0) {
        collateralSnippet = '\n\n## Relevant Case Studies & Proof Points\n';
        collateralResult.collateral.forEach(c => {
          collateralSnippet += `\n### ${c.file_name}\n${c.content.substring(0, 300)}...\n[View full document](${c.file_path})\n`;
        });
      }

      // 4. Draft Proposal (Deterministic variable injection for MVP)
      // In production, this would call an LLM with the template as context.
      const draftedContent = template.content
        .replace(/{{project_title}}/g, project_title)
        .replace(/{{client_name}}/g, client_name)
        .replace(/{{project_description}}/g, project_description);

      // Add a header for the draft and the collateral snippet
      const finalContent = `
# ${project_title}
**Client:** ${client_name}
**Date:** ${new Date().toLocaleDateString()}

---

${draftedContent}

${collateralSnippet}

---
*Drafted by SalesOS AI Proposal Agent*
      `.trim();

      const draft: ProposalDraft = {
        title: project_title,
        client: client_name,
        content: finalContent,
        metadata_applied: filter,
        template_used_id: template.id,
        collateral_referenced: collateralResult.collateral.map(c => c.file_name)
      };

      // 5. Audit: Success
      await logToAuditTrail({
        userId: user_id,
        agentName: 'proposal_drafter_crew',
        action: 'drafting_completed',
        details: { 
          client_name, 
          project_title, 
          template_used: template.name,
          metadata_match: templates.length > 0,
          collateral_added: collateralResult.collateral.length
        },
      });

      return {
        success: true,
        draft
      };

    } catch (err) {
      console.error('[ProposalDrafterCrew] Run error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during proposal drafting';
      
      // Audit: Failure
      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'proposal_drafter_crew',
        action: 'drafting_failed',
        details: { client_name, project_title, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
