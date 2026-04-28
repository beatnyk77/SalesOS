"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { runCrew } from "@/lib/crews/runner";
import type { QualificationOutput } from "@/lib/crews/inbound-qualifier";

export async function qualifyLead(formData: FormData) {
  const supabase = getSupabaseServer();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const email = formData.get("email") as string;
  const companyName = formData.get("company_name") as string;

  // Find the lead record (maybe by email+userId) and set status to IN_PROGRESS
  const { data: leads, error: fetchError } = await supabase
    .from("leads")
    .select("id")
    .eq("user_id", userId)
    .eq("email", email)
    .maybeSingle();

  if (fetchError || !leads) {
    console.error("Lead not found for qualification:", fetchError);
    return { error: "Lead not found" };
  }

  const leadId = leads.id;

  // Update lead status to IN_PROGRESS
  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: "IN_PROGRESS", updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (updateError) {
    console.error("Failed to set lead IN_PROGRESS:", updateError);
  }

  const result = await runCrew({
    crewType: "lead-qualifier",
    userId,
    payload: {
      email,
      companyName,
    },
  });

  if (result.success && result.result) {
    const qualification = result.result as QualificationOutput;

    // Update lead with qualification results
    const { error: updateQualError } = await supabase
      .from("leads")
      .update({
        status: qualification.status, // 'qualified' | 'rejected' | 'pending'
        score: qualification.score,
        summary: qualification.match_keywords?.join(', ') || '',
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateQualError) {
      console.error("Failed to update lead qualification:", updateQualError);
    }

    // Revalidate leads page and dashboard
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");

    return { success: true, qualification };
  } else {
    // Set lead to failed? maybe keep as pending or set to error
    return { success: false, error: result.error };
  }
}