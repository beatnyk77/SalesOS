"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/auth/login");
  }
  return <>{children}</>;
}
