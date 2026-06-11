'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center px-8">
      <p className="text-sm font-mono text-zinc-500 mb-4">SYSTEM FAULT</p>
      <h1 className="text-4xl font-bold tracking-tight mb-3">Something went wrong</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-md">
        An unexpected error occurred. Your data is safe — try again or head back to the terminal.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:bg-zinc-200 transition-all"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
