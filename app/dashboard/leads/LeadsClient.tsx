'use client';

import { useState, useCallback } from 'react';
import { approveLead, type ApprovalAction } from './actions';
import { useLeadsRealtime, type Lead } from '../../../lib/supabase/realtime';

// ─── Score Badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : score >= 50
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-red-500/20 text-red-300 border-red-500/40';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}/100
    </span>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Lead['status'] }) {
  const styles = {
    qualified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    pending: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  };
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded border capitalize tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Lead Approval Card ───────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  userId: string;
}

function LeadApprovalCard({ lead, userId }: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState<ApprovalAction | null>(null);
  const [localStatus, setLocalStatus] = useState(lead.status);

  const handleAction = async (action: ApprovalAction) => {
    if (isLoading || localStatus !== 'pending') return;
    setIsLoading(action);
    try {
      await approveLead(lead.id, userId, action, note.trim() || undefined);
      setLocalStatus(action === 'approved' ? 'qualified' : 'rejected');
    } catch (err) {
      console.error('Approval action failed:', err);
    } finally {
      setIsLoading(null);
    }
  };

  const isActioned = localStatus !== 'pending';

  return (
    <div
      id={`lead-card-${lead.id}`}
      className={`relative rounded-xl border bg-white/5 backdrop-blur-sm transition-all duration-200 ${
        isActioned ? 'opacity-60' : 'hover:bg-white/8 hover:border-white/20'
      } border-white/10`}
    >
      {/* Card Header */}
      <div className="p-4 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {(lead.first_name?.[0] ?? lead.email[0]).toUpperCase()}
        </div>

        {/* Primary Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-white truncate">
              {lead.first_name && lead.last_name
                ? `${lead.first_name} ${lead.last_name}`
                : lead.email}
            </p>
            <StatusPill status={localStatus} />
            <ScoreBadge score={lead.score} />
          </div>
          <p className="text-xs text-white/50 mt-0.5 truncate">
            {lead.email}
            {lead.company_name && ` · ${lead.company_name}`}
            {lead.job_title && ` · ${lead.job_title}`}
          </p>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
          aria-label={isExpanded ? 'Collapse' : 'Expand details'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* AI Reasoning (Collapsible) */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {lead.summary && (
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1">
                Agent Reasoning
              </p>
              <p className="text-xs text-white/70 leading-relaxed">{lead.summary}</p>
            </div>
          )}
          {lead.icp_matching_notes && (
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1">
                ICP Match
              </p>
              <p className="text-xs text-white/70 leading-relaxed">{lead.icp_matching_notes}</p>
            </div>
          )}
          {lead.research_payload && Object.keys(lead.research_payload).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1">
                Research Data
              </p>
              <pre className="text-[10px] text-white/50 bg-white/5 rounded p-2 overflow-x-auto">
                {JSON.stringify(lead.research_payload, null, 2)}
              </pre>
            </div>
          )}

          {/* Human Note */}
          {!isActioned && (
            <div>
              <label
                htmlFor={`note-${lead.id}`}
                className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1 block"
              >
                Optional Note
              </label>
              <textarea
                id={`note-${lead.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add context for the audit trail..."
                className="w-full text-xs bg-white/5 border border-white/10 rounded-lg p-2 text-white/80 placeholder:text-white/30 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isActioned && (
        <div className="px-4 pb-4 flex gap-2">
          <button
            id={`approve-lead-${lead.id}`}
            onClick={() => handleAction('approved')}
            disabled={!!isLoading}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'approved' ? 'Approving…' : '✓ Approve'}
          </button>
          <button
            id={`reject-lead-${lead.id}`}
            onClick={() => handleAction('rejected')}
            disabled={!!isLoading}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-white/70 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'rejected' ? 'Rejecting…' : '✕ Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Realtime Toast ───────────────────────────────────────────────────────────

function RealtimeToast({ lead, onDismiss }: { lead: Lead; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-violet-950 border border-violet-500/40 rounded-xl px-4 py-3 shadow-2xl shadow-violet-950/60 animate-in slide-in-from-bottom-4 duration-300">
      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
      <div>
        <p className="text-xs font-semibold text-white">New lead arrived</p>
        <p className="text-[11px] text-white/60">{lead.email}</p>
      </div>
      <button
        onClick={onDismiss}
        className="ml-2 text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface LeadsClientProps {
  initialLeads: Lead[];
  userId: string;
}

export function LeadsClient({ initialLeads, userId }: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [toast, setToast] = useState<Lead | null>(null);

  const handleLeadUpserted = useCallback((lead: Lead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === lead.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = lead;
        return next;
      }
      setToast(lead);
      return [lead, ...prev];
    });
  }, []);

  const { isSubscribed } = useLeadsRealtime({
    userId,
    onLeadUpserted: handleLeadUpserted,
  });

  const pending = leads.filter((l) => l.status === 'pending');
  const actioned = leads.filter((l) => l.status !== 'pending');

  return (
    <div className="space-y-8">
      {/* Realtime Indicator */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isSubscribed ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'
          }`}
        />
        <span className="text-xs text-white/40">
          {isSubscribed ? 'Live updates active' : 'Connecting…'}
        </span>
      </div>

      {/* Pending Approvals */}
      <section>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
          Pending Review
          {pending.length > 0 && (
            <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/2 p-8 text-center">
            <p className="text-2xl mb-2">🎯</p>
            <p className="text-sm text-white/40">No leads pending review</p>
            <p className="text-xs text-white/25 mt-1">
              New leads will appear here in real-time as they arrive
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pending.map((lead) => (
              <LeadApprovalCard key={lead.id} lead={lead} userId={userId} />
            ))}
          </div>
        )}
      </section>

      {/* Actioned Leads */}
      {actioned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">
            Reviewed
          </h2>
          <div className="grid gap-2">
            {actioned.map((lead) => (
              <LeadApprovalCard key={lead.id} lead={lead} userId={userId} />
            ))}
          </div>
        </section>
      )}

      {/* Realtime Toast */}
      {toast && (
        <RealtimeToast lead={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
