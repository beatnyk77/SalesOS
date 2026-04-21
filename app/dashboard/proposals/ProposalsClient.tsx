/**
 * app/dashboard/proposals/ProposalsClient.tsx
 *
 * Task 19: Proposal UI + editable output.
 *
 * A premium, Linear-fast interface for drafting and editing proposals.
 * Features:
 *  - Multi-step drafting form
 *  - Real-time metadata filtering
 *  - Markdown-capable editor (simplified for demo)
 *  - Audit-logged saving
 */

'use client';

import { useState } from 'react';
import { draftProposalAction, saveProposalAction } from './actions';
import { ProposalDraft } from '../../../lib/agents/crews/proposal-drafter';
import { CollateralCarousel } from '../../../components/ui/CollateralCarousel';

interface ProposalsClientProps {
  userId: string;
}

export default function ProposalsClient({ userId }: ProposalsClientProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    client_name: '',
    project_title: '',
    project_description: '',
    industry: '',
    deal_size: 'mid-market',
    service_type: 'implementation',
  });

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDrafting(true);
    setError(null);

    try {
      const result = await draftProposalAction({
        user_id: userId,
        client_name: formData.client_name,
        project_title: formData.project_title,
        project_description: formData.project_description,
        filter: {
          industry: formData.industry || undefined,
          deal_size: formData.deal_size,
          service_type: formData.service_type,
        },
      });

      if (result.success && result.draft) {
        setDraft(result.draft);
        setEditedContent(result.draft.content);
      } else {
        setError(result.error || 'Failed to generate draft');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveProposalAction(userId, draft.template_used_id, editedContent);
      if (result.success) {
        alert('Proposal draft saved to audit trail!');
      } else {
        setError(result.error || 'Failed to save draft');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Proposal Auto-Drafter</h1>
          <p className="text-zinc-400 mt-1">Generate high-fidelity proposals using metadata-filtered RAG.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Form */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            Project Details
          </h2>
          
          <form onSubmit={handleDraft} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Client Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Project Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. SalesOS Implementation"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  value={formData.project_title}
                  onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Project Description</label>
              <textarea
                required
                rows={4}
                placeholder="Briefly describe the scope and requirements..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all resize-none"
                value={formData.project_description}
                onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Industry</label>
                <input
                  type="text"
                  placeholder="e.g. SaaS"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Deal Size</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none transition-all"
                  value={formData.deal_size}
                  onChange={(e) => setFormData({ ...formData, deal_size: e.target.value })}
                >
                  <option value="small">Small</option>
                  <option value="mid-market">Mid-Market</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Type</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none transition-all"
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                >
                  <option value="implementation">Implementation</option>
                  <option value="consulting">Consulting</option>
                  <option value="managed-services">Managed</option>
                </select>
              </div>
            </div>

            <button
              disabled={isDrafting}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            >
              {isDrafting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Drafting with RAG...
                </span>
              ) : 'Generate Proposal Draft'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Output Editor */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl h-[600px] flex flex-col overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Draft Output</h2>
            {draft && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Draft
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-950/50">
            {draft ? (
              <textarea
                className="w-full h-full bg-transparent text-zinc-300 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {/* Collateral Carousel */}
          {draft?.collateral_referenced && draft.collateral_referenced.length > 0 && (
            <div className="px-6 pb-6 border-t border-zinc-800/50 bg-zinc-900/50">
              <CollateralCarousel items={draft.collateral_referenced} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
