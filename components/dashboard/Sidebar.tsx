/**
 * components/dashboard/Sidebar.tsx
 *
 * Task 22: Sidebar navigation + global layout.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DryRunToggle from './DryRunToggle';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Leads', href: '/dashboard/leads', icon: '🎯' },
  { name: 'Cold Emails', href: '/dashboard/agents/cold-emails', icon: '✉️' },
  { name: 'Proposals', href: '/dashboard/proposals', icon: '📝' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-xl">S</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">SalesOS</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-lg border border-zinc-800'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <span className="text-lg opacity-80">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-4">
        <DryRunToggle />
        
        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Agent Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Qualify</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Personalize</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Draft</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
