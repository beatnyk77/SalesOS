'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function updateContractStatusAction(contractId: string, status: string) {
  const supabase = createServerActionClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) throw new Error('Not authenticated')

  const { data, error: updateError } = await supabase
    .from('contracts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single()

  if (updateError) throw new Error(`Failed to update contract: ${updateError.message}`)

  return { success: true, data }
}
