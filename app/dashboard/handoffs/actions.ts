'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function assignHandoffAction(handoffId: string, assigneeId: string) {
  const supabase = createServerActionClient({ cookies })
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
  const supabase = createServerActionClient({ cookies })
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
