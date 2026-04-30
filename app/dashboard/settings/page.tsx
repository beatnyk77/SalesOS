/**
 * app/dashboard/settings/page.tsx
 *
 * Task 22: Quick-Start MCP onboarding flow.
 */

import { createClient } from '../../../lib/supabase/server';
import QuickStartCard from './QuickStartCard';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-zinc-400 mt-1">Configure your agents and ICP criteria.</p>
      </div>

      <section>
        <QuickStartCard userId={userId} />
      </section>

      {/* Placeholder for other settings */}
      <section className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 border-dashed flex flex-col items-center justify-center text-center">
        <p className="text-zinc-500 text-sm">Advanced agent configuration and CRM syncing coming soon.</p>
      </section>
    </div>
  );
}
