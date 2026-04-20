/**
 * app/dashboard/settings/actions.ts
 */
'use server';

import { revalidatePath } from 'next/cache';
import { ICPGeneratorCrew, ICPGeneratorInput } from '../../../lib/agents/crews/icp-generator';

export async function generateICPAction(input: ICPGeneratorInput) {
  try {
    const crew = new ICPGeneratorCrew();
    const result = await crew.run(input);

    if (result.success) {
      revalidatePath('/dashboard/settings');
      revalidatePath('/dashboard');
      return { success: true, icp_id: result.icp_id };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error('[settings/actions] generateICPAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
