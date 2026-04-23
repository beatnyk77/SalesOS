/**
 * lib/agents/crews/contract-generator.ts
 *
 * Task 45: Contract Generation Crew
 *
 * Pipeline:
 *   1. Takes lead details and deal terms.
 *   2. Generates a structured contract draft (Internal PDF-ready content).
 *   3. Stores record in `contracts` table.
 */

import { getSupabaseServer } from '@/lib/supabase/server';
import { logToAuditTrail } from '../utils';

export interface ContractTerms {
  service_fee: number;
  duration_months: number;
  start_date: string;
  scope: string[];
}

export interface ContractInput {
  lead_id: string;
  user_id: string;
  terms: ContractTerms;
}

export class ContractGeneratorCrew {
  async run(input: ContractInput): Promise<{ success: boolean; contract_id?: string; content?: string; error?: string }> {
    try {
      console.log(`[ContractGeneratorCrew] Generating contract for lead ${input.lead_id}...`);

      const supabase = getSupabaseServer();

      // 1. Fetch Lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', input.lead_id)
        .single();

      if (leadError || !lead) throw new Error(`Lead not found: ${leadError?.message}`);

      // 2. Generate Content (Markdown Template)
      const content = this.generateMarkdownContent(lead, input.terms);

      // 3. Save to Database
      const { data: contract, error: insertError } = await supabase
        .from('contracts')
        .insert({
          user_id: input.user_id,
          lead_id: input.lead_id,
          total_value: input.terms.service_fee,
          terms: {
            ...input.terms,
            markdown_content: content
          },
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to save contract: ${insertError.message}`);

      // 4. Audit
      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'contract_generator_crew',
        action: 'contract_generated',
        details: { lead_id: input.lead_id, contract_id: contract.id },
      });

      return {
        success: true,
        contract_id: contract.id,
        content
      };

    } catch (err: any) {
      console.error('[ContractGeneratorCrew] Error:', err);
      return { success: false, error: err.message };
    }
  }

  private generateMarkdownContent(lead: any, terms: ContractTerms): string {
    return `
# SERVICE AGREEMENT

**Client:** ${lead.company_name}
**Contact:** ${lead.first_name} ${lead.last_name} (${lead.email})
**Date:** ${new Date().toLocaleDateString()}

---

### 1. Scope of Work
The Service Provider agrees to provide the following services to the Client:
${terms.scope.map(s => `- ${s}`).join('\n')}

### 2. Fees and Payment
The total service fee for this engagement is **$${terms.service_fee.toLocaleString()}**.
Payment is due within 15 days of the start date: ${new Date(terms.start_date).toLocaleDateString()}.

### 3. Term
This agreement shall commence on ${new Date(terms.start_date).toLocaleDateString()} and continue for a period of ${terms.duration_months} months.

### 4. Confidentiality
Both parties agree to maintain the confidentiality of all proprietary information shared during the course of this agreement.

---

**Signatures**

Client Signature: _______________________  Date: __________

Provider Signature: _____________________  Date: __________
    `.trim();
  }
}
