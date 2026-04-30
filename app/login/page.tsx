"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-tight">Welcome Back</h2>
        <p className="mt-2 text-sm text-zinc-400">Enter your terminal to manage agents</p>
      </div>

      {message && (
        <div className="p-3 text-sm text-blue-400 bg-blue-900/20 border border-blue-900/50 rounded-xl">
          {message}
        </div>
      )}
      
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@company.com"
            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Authorizing..." : "Sign In"}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-zinc-500">
          New to SalesOS?{" "}
          <Link href="/signup" className="text-white font-bold hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white selection:bg-blue-500/30">
      <Suspense fallback={<div className="text-zinc-500 font-black tracking-widest uppercase text-xs animate-pulse">Initializing Terminal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
