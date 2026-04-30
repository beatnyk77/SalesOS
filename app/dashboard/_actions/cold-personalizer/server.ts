"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runCrew } from "@/lib/crews/runner";

export async function personalizeColdEmail(formData: FormData) {
  const supabase = createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const email = formData.get("email") as string;
  const companyName = formData.get("company_name") as string;
  const leads = (formData.getAll("lead_ids[]") as string[]) || [];

  const result = await runCrew({
    crewType: "cold-personalizer",
    userId,
    payload: {
      leads: leads.map((id) => ({ lead_id: id, email, companyName })),
    },
  });

  if (result.success && result.result) {
    // Map crew results to the shape expected by the database insertion
    const output = result.result as { results?: Array<{ email?: string; subject?: string; body?: string; personalization_signals?: { research_data_available?: boolean } }> };
    const emails = (output.results || []).map((r) => ({
      to: r.email,
      subject: r.subject ?? '',
      body: r.body ?? '',
      full_html: undefined,
      personalization_signals: r.personalization_signals,
    }));

    // Persist drafts into cold_emails table
    for (const e of emails) {
      const { error: insertError } = await supabase
        .from('cold_emails')
        .insert({
          user_id: userId,
          lead_email: e.to,
          subject: e.subject,
          body: e.body,
          full_html: e.full_html,
          personalization_signals: e.personalization_signals,
          status: 'DRAFT',
          metadata: {
            dry_run: true,
            research_data_available: !!e.personalization_signals?.research_data_available,
          },
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to insert cold email draft:', insertError);
      }
    }

    // Revalidate
    revalidatePath('/dashboard/cold-emails');
    revalidatePath('/dashboard');

    return { success: true, emails };
  } else {
    return { success: false, error: result.error };
  }
}
