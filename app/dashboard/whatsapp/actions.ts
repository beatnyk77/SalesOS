'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function approveWhatsAppMessageAction(messageId: string, updatedBody?: string) {
  const supabase = createServerActionClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Not authenticated')
  }

  const updates: { status: string; message_body?: string } = { status: 'sent' }
  if (updatedBody) {
    updates.message_body = updatedBody
  }

  const { data, error: updateError } = await supabase
    .from('whatsapp_messages')
    .update(updates)
    .eq('id', messageId)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to approve message: ${updateError.message}`)
  }

  return { success: true, data }
}

export async function rejectWhatsAppMessageAction(messageId: string) {
  const supabase = createServerActionClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Not authenticated')
  }

  const { data, error: updateError } = await supabase
    .from('whatsapp_messages')
    .update({ status: 'rejected' })
    .eq('id', messageId)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to reject message: ${updateError.message}`)
  }

  return { success: true, data }
}
