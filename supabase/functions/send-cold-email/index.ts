import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'team@salesos.io' // User needs to configure this

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const {
      to,
      subject,
      html,
      user_id,
      cold_email_id,
      dry_run = true
    } = await req.json();

    if (dry_run) {
      return new Response(
        JSON.stringify({ success: true, message: "Dry run successful. No email sent.", mock: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured in Edge Function secrets");
    }

    // Call Resend API directly
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Resend API error: ${errorData.message || res.statusText}`);
    }

    const data = await res.json();

    // Update the cold_emails table
    if (cold_email_id) {
      await supabase
        .from('cold_emails')
        .update({ status: 'sent', metadata: { resend_id: data.id } })
        .eq('id', cold_email_id)
        .eq('user_id', user_id);
    }

    // Log to Audit Trail
    await supabase.from('agent_audit_trail').insert({
      user_id,
      agent_name: 'Cold Email Sender',
      action: 'email_sent',
      details: {
        to,
        subject,
        cold_email_id,
        resend_id: data.id
      }
    })

    return new Response(
      JSON.stringify({ success: true, resend_id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("send-cold-email error:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
