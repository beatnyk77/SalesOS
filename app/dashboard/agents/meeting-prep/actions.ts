'use server'

import { createClient } from '@/lib/supabase/server'
import { MeetingPrepCrew } from '@/lib/agents/crews/meeting-prep'
import { revalidatePath } from 'next/cache'

export interface GenerateBriefInput {
  company_name: string
  attendees: { name: string; role?: string; linkedin_url?: string }[]
  scheduled_at: string
  description?: string
}

export interface GenerateBriefResult {
  success: boolean
  brief?: {
    meeting_id: string
    summary: string
    company_background: {
      overview: string
      recent_news: string[]
      tech_stack: string[]
    }
    attendee_profiles: Array<{ name: string; role: string; research_summary: string }>
    strategic_insights: {
      objections: string[]
      talking_points: string[]
    }
    raw_research_ids: string[]
  }
  error?: string
}

export async function generateMeetingBriefAction(
  input: GenerateBriefInput
): Promise<GenerateBriefResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const crew = new MeetingPrepCrew()
  const result = await crew.run({
    meeting_id: crypto.randomUUID(),
    user_id: user.id,
    company_name: input.company_name,
    attendees: input.attendees,
    scheduled_at: input.scheduled_at,
    description: input.description,
  })

  revalidatePath('/dashboard/agents/meeting-prep')
  return result
}
