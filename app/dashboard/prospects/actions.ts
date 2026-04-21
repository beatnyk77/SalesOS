'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { BulkProspectEvaluatorCrew } from '../../../lib/agents/crews/bulk-prospect-evaluator'

export async function evaluateProspectListAction(listId: string) {
  const supabase = createServerActionClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Not authenticated')
  }

  try {
    const evaluator = new BulkProspectEvaluatorCrew(session.user.id)
    // Run evaluation in background (or await if short, but we'll await for simplicity here)
    const results = await evaluator.run(listId)
    return { success: true, results }
  } catch (err: any) {
    console.error("Bulk Evaluation Error:", err)
    throw new Error(err.message || 'Failed to evaluate prospect list')
  }
}
