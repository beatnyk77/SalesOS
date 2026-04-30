'use client'

import { useState } from 'react'
import { generateMeetingBriefAction, type GenerateBriefResult } from './actions'

interface AttendeeRow {
  id: string
  name: string
  role: string
  linkedin_url: string
}

export default function MeetingPrepClient() {
  const [company, setCompany] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [description, setDescription] = useState('')
  const [attendees, setAttendees] = useState<AttendeeRow[]>([
    { id: crypto.randomUUID(), name: '', role: '', linkedin_url: '' },
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerateBriefResult | null>(null)

  const addAttendee = () =>
    setAttendees((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', role: '', linkedin_url: '' },
    ])

  const removeAttendee = (id: string) =>
    setAttendees((prev) => prev.filter((a) => a.id !== id))

  const updateAttendee = (id: string, field: keyof AttendeeRow, value: string) =>
    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setResult(null)
    try {
      const res = await generateMeetingBriefAction({
        company_name: company,
        scheduled_at: scheduledAt,
        description,
        attendees: attendees
          .filter((a) => a.name.trim())
          .map(({ name, role, linkedin_url }) => ({ name, role: role || undefined, linkedin_url: linkedin_url || undefined })),
      })
      setResult(res)
    } catch {
      setResult({ success: false, error: 'An unexpected error occurred.' })
    } finally {
      setIsGenerating(false)
    }
  }

  const inputCls =
    'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-sm'
  const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <span className="text-3xl">🎯</span> Meeting Prep Brief
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">
          Enter meeting details — agents research the company &amp; attendees and generate a
          battle-ready 1-page brief in seconds.
        </p>
      </div>

      {/* Form */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Company Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Stripe"
                className={inputCls}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Meeting Date &amp; Time</label>
              <input
                required
                type="datetime-local"
                className={inputCls}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Meeting Context (optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Discovery call re: sales automation platform"
              className={`${inputCls} resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Attendees */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls}>Attendees</label>
              <button
                type="button"
                onClick={addAttendee}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                + Add Attendee
              </button>
            </div>
            <div className="space-y-3">
              {attendees.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Full name"
                      className={inputCls}
                      value={a.name}
                      onChange={(e) => updateAttendee(a.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Role / Title"
                      className={inputCls}
                      value={a.role}
                      onChange={(e) => updateAttendee(a.id, 'role', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="url"
                      placeholder="LinkedIn URL (optional)"
                      className={inputCls}
                      value={a.linkedin_url}
                      onChange={(e) => updateAttendee(a.id, 'linkedin_url', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {attendees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttendee(a.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
                        aria-label="Remove attendee"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating Brief...
              </span>
            ) : (
              'Generate Meeting Brief'
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {result && !result.success && (
        <div className="rounded-2xl bg-red-900/20 border border-red-800/50 p-6 text-red-300 text-sm">
          <strong className="block text-red-400 mb-1">Error</strong>
          {result.error}
        </div>
      )}

      {/* Brief Output */}
      {result?.success && result.brief && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/30 rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">Brief Summary</p>
            <p className="text-white font-medium">{result.brief.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Background */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                🏢 Company Background
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {result.brief.company_background.overview}
              </p>
              {result.brief.company_background.tech_stack.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2 font-medium">Tech Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {result.brief.company_background.tech_stack.map((t) => (
                      <span key={t} className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.brief.company_background.recent_news.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2 font-medium">Recent News</p>
                  <ul className="space-y-1">
                    {result.brief.company_background.recent_news.map((n, i) => (
                      <li key={i} className="text-zinc-400 text-sm flex gap-2">
                        <span className="text-blue-400 mt-0.5">•</span> {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Strategic Insights */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                ⚡ Strategic Insights
              </h3>
              <div>
                <p className="text-xs text-zinc-500 mb-2 font-medium">Likely Objections</p>
                <ul className="space-y-2">
                  {result.brief.strategic_insights.objections.map((o, i) => (
                    <li key={i} className="text-zinc-400 text-sm flex gap-2">
                      <span className="text-amber-400 mt-0.5">⚠</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2 font-medium">Talking Points</p>
                <ul className="space-y-2">
                  {result.brief.strategic_insights.talking_points.map((tp, i) => (
                    <li key={i} className="text-zinc-400 text-sm flex gap-2">
                      <span className="text-green-400 mt-0.5">✓</span> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Attendee Profiles */}
          {result.brief.attendee_profiles.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4">
                👥 Attendee Profiles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.brief.attendee_profiles.map((ap, i) => (
                  <div key={i} className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {ap.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{ap.name}</p>
                        <p className="text-zinc-500 text-xs">{ap.role}</p>
                      </div>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed">{ap.research_summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
