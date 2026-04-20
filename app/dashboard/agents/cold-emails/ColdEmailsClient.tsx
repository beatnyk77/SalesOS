'use client';

/**
 * app/dashboard/agents/cold-emails/ColdEmailsClient.tsx
 *
 * Task 14: Cold Email Approval Carousel — HITL review interface.
 *
 * Design: Linear-fast dark theme, carousel with keyboard navigation.
 * - Left/right arrow to browse drafts
 * - Approve → sets status 'approved' + audit log
 * - Reject  → sets status 'rejected' + audit log
 * - Send    → triggers stub send (requires 'approved' first)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  approveColdEmailAction,
  rejectColdEmailAction,
  sendColdEmailAction,
} from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColdEmail {
  id: string;
  user_id: string;
  lead_email: string;
  lead_name: string | null;
  company_name: string | null;
  subject: string;
  body: string;
  personalization_notes: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent';
  created_at: string;
  sent_at: string | null;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ColdEmail['status'] }) {
  const styles: Record<ColdEmail['status'], string> = {
    draft: 'bg-white/10 text-white/50 border-white/20',
    pending_approval: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    sent: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };

  const labels: Record<ColdEmail['status'], string> = {
    draft: 'Draft',
    pending_approval: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    sent: 'Sent',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide ${styles[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {labels[status]}
    </span>
  );
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  onClick,
}: {
  total: number;
  current: number;
  onClick: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onClick(i)}
          aria-label={`Go to email ${i + 1}`}
          className={`rounded-full transition-all duration-200 ${
            i === current
              ? 'w-5 h-1.5 bg-violet-400'
              : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Email Body Preview ───────────────────────────────────────────────────────

function EmailBodyPreview({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const SHORT_LIMIT = 300;
  const isLong = body.length > SHORT_LIMIT;

  return (
    <div className="relative">
      <div
        className={`text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-mono bg-white/3 rounded-xl p-4 border border-white/8 transition-all duration-300 ${
          !expanded && isLong ? 'max-h-40 overflow-hidden' : ''
        }`}
      >
        {body}
      </div>

      {isLong && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d0d14] to-transparent rounded-b-xl pointer-events-none" />
      )}

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {expanded ? '↑ Show less' : '↓ Show full email'}
        </button>
      )}
    </div>
  );
}

// ─── Single Card ──────────────────────────────────────────────────────────────

interface CardProps {
  email: ColdEmail;
  userId: string;
  onStatusChange: (id: string, status: ColdEmail['status']) => void;
}

function ColdEmailCard({ email, userId, onStatusChange }: CardProps) {
  const [localStatus, setLocalStatus] = useState(email.status);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isTerminal = localStatus === 'rejected' || localStatus === 'sent';

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleApprove = async () => {
    setLoadingAction('approve');
    const res = await approveColdEmailAction(email.id, userId, note || undefined);
    if (res.success) {
      setLocalStatus('approved');
      onStatusChange(email.id, 'approved');
      showFeedback('success', 'Email approved and ready to send.');
    } else {
      showFeedback('error', res.error ?? 'Approval failed.');
    }
    setLoadingAction(null);
  };

  const handleReject = async () => {
    setLoadingAction('reject');
    const res = await rejectColdEmailAction(email.id, userId, note || undefined);
    if (res.success) {
      setLocalStatus('rejected');
      onStatusChange(email.id, 'rejected');
      showFeedback('success', 'Email rejected and removed from queue.');
    } else {
      showFeedback('error', res.error ?? 'Rejection failed.');
    }
    setLoadingAction(null);
  };

  const handleSend = async () => {
    setLoadingAction('send');
    const res = await sendColdEmailAction(email.id, userId);
    if (res.success) {
      setLocalStatus('sent');
      onStatusChange(email.id, 'sent');
      showFeedback('success', res.message ?? 'Email sent successfully.');
    } else {
      showFeedback('error', res.error ?? res.message ?? 'Send failed.');
    }
    setLoadingAction(null);
  };

  return (
    <div
      id={`cold-email-card-${email.id}`}
      className="flex flex-col gap-5"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={localStatus} />
            {email.company_name && (
              <span className="text-xs text-white/40 font-medium">{email.company_name}</span>
            )}
          </div>
          <p className="font-semibold text-white truncate text-base">
            {email.lead_name ?? email.lead_email}
          </p>
          <p className="text-xs text-white/40 mt-0.5 truncate">{email.lead_email}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Created</p>
          <p className="text-xs text-white/50">
            {new Date(email.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Subject Line */}
      <div>
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5">
          Subject
        </p>
        <div className="bg-violet-500/8 border border-violet-500/20 rounded-lg px-3 py-2">
          <p className="text-sm text-violet-200 font-medium">{email.subject}</p>
        </div>
      </div>

      {/* Body */}
      <div>
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5">
          Email Body
        </p>
        <EmailBodyPreview body={email.body} />
      </div>

      {/* AI Personalization Notes */}
      {email.personalization_notes && (
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5">
            AI Reasoning
          </p>
          <p className="text-xs text-white/55 bg-white/3 rounded-lg p-3 border border-white/8 leading-relaxed italic">
            {email.personalization_notes}
          </p>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm font-medium border animate-in slide-in-from-bottom-2 duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Action Zone */}
      {!isTerminal && (
        <div className="space-y-3 border-t border-white/8 pt-4">
          {/* Note input */}
          <div>
            <label
              htmlFor={`email-note-${email.id}`}
              className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1.5"
            >
              Reviewer Note (optional)
            </label>
            <input
              id={`email-note-${email.id}`}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for approval/rejection (goes to audit trail)…"
              className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {localStatus !== 'approved' && (
              <button
                id={`approve-email-${email.id}`}
                onClick={handleApprove}
                disabled={!!loadingAction}
                className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === 'approve' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Approving…
                  </span>
                ) : (
                  '✓ Approve'
                )}
              </button>
            )}

            {localStatus === 'approved' && (
              <button
                id={`send-email-${email.id}`}
                onClick={handleSend}
                disabled={!!loadingAction}
                className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === 'send' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending…
                  </span>
                ) : (
                  '↑ Send Email'
                )}
              </button>
            )}

            <button
              id={`reject-email-${email.id}`}
              onClick={handleReject}
              disabled={!!loadingAction}
              className="py-2.5 px-4 text-sm font-semibold rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-300 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingAction === 'reject' ? '…' : '✕ Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Terminal State Badge */}
      {isTerminal && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/8">
          <span className="text-xs text-white/30">
            {localStatus === 'sent'
              ? `Sent ${email.sent_at ? new Date(email.sent_at).toLocaleDateString() : 'recently'}`
              : 'Rejected — removed from outreach queue'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Carousel Component ──────────────────────────────────────────────────

interface ColdEmailsClientProps {
  initialEmails: ColdEmail[];
  userId: string;
}

export function ColdEmailsClient({ initialEmails, userId }: ColdEmailsClientProps) {
  const [emails, setEmails] = useState<ColdEmail[]>(initialEmails);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update local status optimistically after action
  const handleStatusChange = useCallback(
    (id: string, status: ColdEmail['status']) => {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
    },
    []
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => Math.min(emails.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [emails.length]);

  const pending = emails.filter((e) => e.status === 'pending_approval' || e.status === 'draft');
  const approved = emails.filter((e) => e.status === 'approved');
  const sent = emails.filter((e) => e.status === 'sent');
  const rejected = emails.filter((e) => e.status === 'rejected');

  const current = emails[currentIndex];

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
          ✉️
        </div>
        <p className="text-white/40 text-sm">No cold emails yet.</p>
        <p className="text-white/25 text-xs text-center max-w-xs">
          Upload a CSV to trigger the personalization pipeline and drafts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: pending.length, color: 'text-amber-300' },
          { label: 'Approved', value: approved.length, color: 'text-emerald-300' },
          { label: 'Sent', value: sent.length, color: 'text-sky-300' },
          { label: 'Rejected', value: rejected.length, color: 'text-red-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-center"
          >
            <p className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-white/35 uppercase tracking-widest mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Navigation Buttons */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-10">
          <button
            id="carousel-prev"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            aria-label="Previous email"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">
          <button
            id="carousel-next"
            onClick={() => setCurrentIndex((i) => Math.min(emails.length - 1, i + 1))}
            disabled={currentIndex === emails.length - 1}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            aria-label="Next email"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Card */}
        <div className="mx-6 rounded-2xl border border-white/10 bg-white/4 backdrop-blur-sm p-6 min-h-[480px] transition-all duration-200 hover:border-white/15">
          {current && (
            <ColdEmailCard
              key={current.id}
              email={current}
              userId={userId}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>

      {/* Carousel Controls */}
      <div className="flex items-center justify-between px-6">
        <p className="text-xs text-white/30 tabular-nums">
          {currentIndex + 1} / {emails.length}
        </p>
        <ProgressDots
          total={emails.length}
          current={currentIndex}
          onClick={setCurrentIndex}
        />
        <p className="text-[10px] text-white/20">← → keys to navigate</p>
      </div>
    </div>
  );
}
