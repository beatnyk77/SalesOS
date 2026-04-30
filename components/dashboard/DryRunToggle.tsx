/**
 * components/dashboard/DryRunToggle.tsx
 *
 * Task 25: Dry-run toggle visible in UI.
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';

export default function DryRunToggle() {
  const [isDryRun, setIsDryRun] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  // Use the pre-configured singleton client

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('user_agent_settings')
        .select('dry_run_mode')
        .single();
      
      if (data) {
        setIsDryRun(data.dry_run_mode);
      }
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

  const toggleDryRun = async () => {
    const newValue = !isDryRun;
    setIsDryRun(newValue);
    
    const { error: updateError } = await supabase
      .from('user_agent_settings')
      .upsert({ dry_run_mode: newValue }, { onConflict: 'user_id' });

    if (updateError) {
      console.error('[DryRunToggle] Failed to update:', updateError);
      setIsDryRun(!newValue); // Rollback
    }
  };

  if (isLoading) return <div className="h-10 w-full bg-zinc-900 animate-pulse rounded-xl" />;

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Safety Mode</span>
        <span className="text-xs text-zinc-400 font-medium">Dry-Run Only</span>
      </div>
      <button
        onClick={toggleDryRun}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          isDryRun ? 'bg-amber-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isDryRun ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
