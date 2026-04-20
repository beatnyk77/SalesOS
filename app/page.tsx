/**
 * app/page.tsx
 *
 * SalesOS Landing Page - Premium, High-Signal, Beta Launch.
 */

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-xl">S</span>
          </div>
          <span className="text-xl font-bold tracking-tight">SalesOS</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/dashboard" className="bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:bg-zinc-200 transition-all">
            Enter Terminal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Beta v0.1.0 Now Live
          </div>
          
          <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-[0.9] max-w-4xl mx-auto">
            Autonomous Sales <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600">Intelligence.</span>
          </h1>
          
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
            The institutional-grade terminal for high-velocity sales teams. 
            Qualify leads, personalize outreach, and draft proposals—all on autopilot.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/dashboard" className="bg-white text-black text-lg font-bold px-8 py-4 rounded-2xl hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98]">
              Launch Dashboard
            </Link>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="mt-20 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20 pointer-events-none" />
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl transform group-hover:scale-[1.01] transition-all duration-700 overflow-hidden">
              <div className="bg-black rounded-2xl h-[400px] md:h-[600px] w-full flex flex-col">
                <div className="h-12 border-b border-zinc-900 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-zinc-800" />
                    <div className="w-3 h-3 rounded-full bg-zinc-800" />
                    <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-zinc-700 font-mono text-sm animate-pulse">Initializing Agentic Pipeline...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <span className="text-black font-black text-xs">S</span>
            </div>
            <span className="text-sm font-bold tracking-tight">SalesOS</span>
          </div>
          <p className="text-zinc-500 text-xs">© 2026 Vibecode. Institutional Sovereignty for Sales.</p>
        </div>
      </footer>
    </div>
  );
}
