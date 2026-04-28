'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Lead {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  phone_number?: string | null;
  status: 'qualified' | 'rejected' | 'pending';
  score: number;
  summary: string | null;
  icp_matching_notes: string | null;
  research_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface UseLeadsRealtimeOptions {
  userId: string | null;
  /** Filter to only listen to leads with specific statuses */
  statusFilter?: Lead['status'][];
  onLeadUpserted?: (lead: Lead) => void;
}

/**
 * Task 9: Supabase Realtime hook for the leads table.
 *
 * Subscribes to INSERT and UPDATE events on public.leads,
 * filtered by the current user (via RLS + client-side filter).
 * Notifies the UI in real-time when a lead is qualified or updated.
 */
export function useLeadsRealtime({
  userId,
  statusFilter,
  onLeadUpserted,
}: UseLeadsRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Create a unique channel name per user to avoid conflicts
    const channelName = `leads:user_id=eq.${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT and UPDATE
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const lead = payload.new as Lead;

          // Apply optional client-side status filter
          if (statusFilter && statusFilter.length > 0) {
            if (!statusFilter.includes(lead.status)) return;
          }

          onLeadUpserted?.(lead);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError(`Realtime subscription error: ${status}`);
          setIsSubscribed(false);
        }
      });

    channelRef.current = channel;

    return cleanup;
  }, [userId, statusFilter, onLeadUpserted, cleanup]);

  return { isSubscribed, error };
}
