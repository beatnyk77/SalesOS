"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Hook to subscribe to realtime changes in the `agent_audit_trail` table.
 * When a new audit entry is inserted, it triggers a callback (e.g., refetch initial actions).
 */
export function useAgentAuditTrailChanges(
  onChange: () => void
) {
  useEffect(() => {
    const channel = supabase
      .channel("agent-audit-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_audit_trail",
        },
        (payload) => {
          console.log("[Realtime] Audit trail changed", payload);
          onChange();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
}