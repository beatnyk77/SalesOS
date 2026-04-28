'use server'

import { getSupabaseServer } from '@/lib/supabase/server'

export async function assignHandoffAction(handoffId: string, assigneeId: string) {
  const supabase = getSupabaseServer()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Not authenticated')
  }

  const { data, error: updateError } = await supabase
    .from('team_handoffs')
    .update({ assigned_to: assigneeId, status: 'in_progress' })
    .eq('id', handoffId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to assign handoff: ${updateError.message}`)
  }

  return { success: true, data }
}

export async function completeHandoffAction(handoffId: string) {
  const supabase = getSupabaseServer()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Not authenticated')
  }

  const { data, error: updateError } = await supabase
    .from('team_handoffs')
    .update({ status: 'completed' })
    .eq('id', handoffId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to complete handoff: ${updateError.message}`)
  }

  return { success: true, data }
}
