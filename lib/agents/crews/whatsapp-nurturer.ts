import { getSupabaseServer } from '@/lib/supabase/server';
import { logToAuditTrail } from '../utils';
import { CollateralRAGCrew } from './collateral-rag';

export interface WhatsAppNurturerInput {
  leadId: string;
  context: 'stalled' | 'post-proposal' | 'intro';
}

export interface WhatsAppMessageDraft {
  phone_number: string;
  message_body: string;
  reasoning: string;
}

/**
 * WhatsApp Nurturer Crew
 * 
 * Generates personalized, concise WhatsApp follow-up messages based on lead data
 * and retrieved collateral. Queues messages for approval (dry-run).
 */
export class WhatsAppNurturerCrew {
  private userId: string;
  private collateralCrew: CollateralRAGCrew;

  constructor(userId: string) {
    this.userId = userId;
    this.collateralCrew = new CollateralRAGCrew();
  }

  async run(input: WhatsAppNurturerInput): Promise<WhatsAppMessageDraft> {
    const supabase = getSupabaseServer();

    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', input.leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || input.leadId}`);
    }

    if (!lead.phone_number) {
      throw new Error("Lead does not have a phone number.");
    }

    // 2. Fetch Relevant Collateral based on Lead's industry or metadata
    const industry = lead.research_payload?.industry || lead.metadata?.industry || '';
    const collateralResult = await this.collateralCrew.run({
      user_id: this.userId,
      filter: {
        industry: industry,
        deal_stage: input.context === 'post-proposal' ? 'Proposal' : undefined
      }
    });

    // 3. Generate Message (Simulated LLM Writer Agent)
    const draft = this.generateMessage(lead, input.context, collateralResult.collateral);

    // 4. Queue the message (Dry-Run)
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: this.userId,
        lead_id: lead.id,
        phone_number: draft.phone_number,
        message_body: draft.message_body,
        reasoning: draft.reasoning,
        status: 'draft' // Queued for approval
      });

    if (insertError) {
      throw new Error(`Failed to queue message: ${insertError.message}`);
    }

    // 5. Log to Audit Trail
    await logToAuditTrail({
      userId: this.userId,
      agentName: 'WhatsApp Nurturer Crew',
      action: 'whatsapp_message_drafted',
      details: {
        lead_id: lead.id,
        context: input.context,
        reasoning: draft.reasoning,
        collateral_injected: collateralResult.collateral.length > 0
      }
    });

    return draft;
  }

  private generateMessage(lead: any, context: string, collateral: any[]): WhatsAppMessageDraft {
    const firstName = lead.first_name || 'there';
    const companyName = lead.company_name || 'your team';
    
    let message_body = '';
    let reasoning = `Generated based on context: ${context}. `;

    if (context === 'stalled') {
      message_body = `Hi ${firstName}, checking in! We noticed things have been quiet at ${companyName}. `;
      reasoning += `Lead has been inactive. `;
    } else if (context === 'post-proposal') {
      message_body = `Hi ${firstName}, hope you had a chance to review the proposal for ${companyName}. `;
      reasoning += `Following up on a sent proposal. `;
    } else {
      message_body = `Hi ${firstName}! Reaching out to see how things are going at ${companyName}. `;
      reasoning += `General introductory follow-up. `;
    }

    if (collateral && collateral.length > 0) {
      const doc = collateral[0];
      message_body += `I thought you might find this interesting: our latest ${doc.metadata?.document_type || 'resource'} specifically covers challenges in your sector.`;
      reasoning += `Injected collateral: ${doc.file_name}.`;
    } else {
      message_body += `Let me know if you have any questions or want to jump on a quick call.`;
      reasoning += `No specific collateral matched, used generic call-to-action.`;
    }

    return {
      phone_number: lead.phone_number,
      message_body,
      reasoning
    };
  }
}
