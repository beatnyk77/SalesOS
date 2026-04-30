"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runCrew } from "@/lib/crews/runner";

export async function proposeDraft(prevState: { success?: boolean; error?: string } | null, formData: FormData): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const supabase = createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const client_name = formData.get("client_name") as string;
  const project_title = formData.get("project_title") as string;
  const project_description = formData.get("project_description") as string;

  // Update lead/proposal status to IN_PROGRESS so the UI can reflect work happening
  const { error: updateError } = await supabase
    .from("proposal_templates") // placeholder — adapt to your table if different
    .update({ status: "IN_PROGRESS", updated_at: new Date().toISOString() })
    .eq("id", formData.get("template_id") || "")
    .limit(1);

  if (updateError) {
    console.error("Failed to set IN_PROGRESS:", updateError);
  }

  const result = await runCrew({
    crewType: "proposal-drafter",
    userId,
    payload: {
      client_name,
      project_title,
      project_description,
      filter: {
        industry: formData.get("industry") || "",
        deal_size: formData.get("deal_size") || "",
        service_type: formData.get("service_type") || "",
        client_tier: formData.get("client_tier") || "",
      },
    },
  });

  if (result.success && result.result) {
    const output = result.result as { draft?: { title?: string; content?: string; metadata_applied?: string[]; template_used_id?: string } };
    const draft = output.draft;
    if (!draft) return { success: false, error: 'No draft returned' };

    // Persist draft content and metadata; you may store it in a "proposal_drafts" table instead
    const { error: insertError } = await supabase
      .from("proposal_drafts")
      .insert({
        user_id: userId,
        title: draft.title,
        content: draft.content,
        metadata_applied: draft.metadata_applied,
        template_used_id: draft.template_used_id,
        status: "DRAFT",
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert proposal draft:", insertError);
    }

    // Revalidate the proposals page so the new draft appears
    revalidatePath("/dashboard/proposals");
    revalidatePath("/dashboard");

    return { success: true };
  } else {
    // Optionally set back to a failed/needs-review state
    return { success: false, error: result.error };
  }
}
