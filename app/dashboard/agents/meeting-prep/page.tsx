import type { Metadata } from 'next'
import { Suspense } from 'react'
import MeetingPrepClient from './MeetingPrepClient'

export const metadata: Metadata = {
  title: 'Meeting Prep · SalesOS',
  description: 'Generate AI-powered 1-page meeting briefs in seconds',
}

export const dynamic = 'force-dynamic'

export default function MeetingPrepPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500 text-sm uppercase tracking-widest animate-pulse">
            Loading...
          </div>
        </div>
      }>
        <MeetingPrepClient />
      </Suspense>
    </div>
  )
}
