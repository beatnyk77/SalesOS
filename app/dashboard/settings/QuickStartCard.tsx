/**
 * app/dashboard/settings/QuickStartCard.tsx
 *
 * Task 22: Quick-Start MCP onboarding flow.
 */

'use client';

import { useState } from 'react';
import { generateICPAction } from './actions';

interface QuickStartCardProps {
  userId: string;
}

export default function QuickStartCard({ userId }: QuickStartCardProps) {
  const [url, setUrl] = useState('');
  const [company, setCompany] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await generateICPAction({
        user_id: userId,
        source_url: url,
        company_name: company
      });

      if (res.success) {
        setResult({ success: true, message: 'ICP generated and saved successfully!' });
        setUrl('');
        setCompany('');
      } else {
        setResult({ success: false, message: res.error || 'Failed to generate ICP' });
      }
    } catch {
      setResult({ success: false, message: 'An unexpected error occurred' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-3xl">🚀</span> Quick-Start Onboarding
        </h2>
        <p className="text-zinc-400 mb-8">
          Enter your company website or LinkedIn profile. Our agents will research your business and auto-generate your Ideal Customer Profile (ICP) for lead scoring.
        </p>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Company Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Stripe"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Website / LinkedIn</label>
              <input
                required
                type="url"
                placeholder="https://company.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <button
            disabled={isGenerating}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing your business...
              </span>
            ) : 'Auto-Generate My ICP'}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-xl border ${
            result.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <p className="text-sm font-medium flex items-center gap-2">
              {result.success ? '✅' : '❌'} {result.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
