/**
 * app/dashboard/layout.tsx
 *
 * Task 22: Sidebar navigation + global layout.
 */

import { createClient } from '../../lib/supabase/server';
import Sidebar from '../../components/dashboard/Sidebar';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[DashboardLayout] No active session. Redirecting to login.');
    redirect('/login'); 
  }
  return (
    <div className="flex min-h-screen bg-black text-zinc-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-end px-8 sticky top-0 bg-black/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 shadow-lg" />
          </div>
        </header>
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
