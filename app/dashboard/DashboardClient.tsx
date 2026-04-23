/**
 * app/dashboard/DashboardClient.tsx
 *
 * Task 21: Dashboard home – Actions Pending Approval carousel.
 *
 * A premium, central command center for the SalesOS platform.
 * Aggregates all human-in-the-loop (HITL) actions into a single carousel.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DashboardAction {
  id: string;
  type: 'lead' | 'email' | 'proposal';
  title: string;
  subtitle: string;
  description: string;
  timestamp: string;
  href: string;
}

interface DashboardClientProps {
  initialActions: DashboardAction[];
  stats: {
    totalLeads: number;
    activeCampaigns: number;
    pendingApprovals: number;
    weeklyActions: number;
  };
  velocity: number[];
}

export default function DashboardClient({ initialActions, stats, velocity }: DashboardClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextAction = () => {
    if (initialActions.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % initialActions.length);
  };

  const prevAction = () => {
    if (initialActions.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + initialActions.length) % initialActions.length);
  };

  const maxVelocity = Math.max(...velocity, 1);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: stats.totalLeads, color: 'text-blue-400' },
          { label: 'Active Campaigns', value: stats.activeCampaigns, color: 'text-emerald-400' },
          { label: 'Pending Approvals', value: stats.pendingApprovals, color: 'text-amber-400' },
          { label: 'Weekly Actions', value: stats.weeklyActions, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Carousel Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Actions Pending Approval
            <span className="bg-amber-500/10 text-amber-500 text-xs px-2.5 py-1 rounded-full border border-amber-500/20">
              {initialActions.length} Priority
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={prevAction}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextAction}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {initialActions.length > 0 ? (
          <div className="relative h-[320px] w-full overflow-hidden rounded-3xl group">
            {initialActions.map((action, idx) => {
              const isPrev = idx === (activeIndex - 1 + initialActions.length) % initialActions.length;
              const isActive = idx === activeIndex;
              const isNext = idx === (activeIndex + 1) % initialActions.length;

              let position = 'translate-x-full opacity-0 scale-95';
              if (isActive) position = 'translate-x-0 opacity-100 scale-100 z-20';
              if (isPrev) position = '-translate-x-full opacity-0 scale-95 z-10';
              if (isNext) position = 'translate-x-full opacity-0 scale-95 z-10';

              return (
                <div
                  key={action.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${position}`}
                >
                  <div className="h-full w-full bg-gradient-to-br from-zinc-800/50 to-zinc-950 border border-zinc-700/50 rounded-3xl p-10 flex flex-col justify-between shadow-2xl backdrop-blur-md">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          action.type === 'lead' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          action.type === 'email' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {action.type}
                        </span>
                        <span className="text-zinc-500 text-xs">{new Date(action.timestamp).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-4xl font-bold text-white tracking-tight">{action.title}</h3>
                      <p className="text-xl text-zinc-400 font-medium">{action.subtitle}</p>
                      <p className="text-zinc-500 line-clamp-2 max-w-2xl">{action.description}</p>
                    </div>

                    <Link
                      href={action.href}
                      className="inline-flex items-center gap-2 text-white font-semibold group/btn"
                    >
                      Review & Approve
                      <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl h-[320px] flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-400">All caught up!</h3>
            <p className="text-zinc-600 mt-2 max-w-sm">
              Your agents are hard at work. We'll alert you when a lead, email, or proposal needs your expert eye.
            </p>
          </div>
        )}
      </section>

      {/* Agents Quick Access & Analytics */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Lead Qualifier', status: 'Running', health: 'Healthy', icon: '🎯', href: '/dashboard/leads' },
            { name: 'Cold Personalizer', status: 'Idle', health: 'Healthy', icon: '✉️', href: '/dashboard/agents/cold-emails' },
            { name: 'Proposal Drafter', status: 'Idle', health: 'Healthy', icon: '📝', href: '/dashboard/proposals' },
          ].map((agent, i) => (
            <Link
              key={i}
              href={agent.href}
              className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all shadow-lg hover:shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{agent.icon}</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {agent.health}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{agent.name}</h3>
              <p className="text-zinc-500 text-sm mt-1">{agent.status}</p>
            </Link>
          ))}
        </div>

        {/* Weekly Analytics Widget */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Action Velocity</h3>
            <span className="text-[10px] text-zinc-500 font-medium">LAST 7 DAYS</span>
          </div>
          <div className="flex items-end justify-between h-32 gap-2">
            {velocity.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-all rounded-t-sm relative"
                  style={{ height: `${(val / maxVelocity) * 100}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {val} runs
                  </div>
                </div>
                <span className="text-[10px] text-zinc-600 font-bold">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][(new Date().getDay() + i + 1) % 7]}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Efficiency Score</span>
              <span className="text-emerald-400 font-bold">98.2%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
