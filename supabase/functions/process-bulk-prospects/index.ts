import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"
import Papa from "https://esm.sh/papaparse@5.4.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing env vars")
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Auth Header")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error("Unauthorized")

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const listName = formData.get('name') as string || file.name

    if (!file) throw new Error("File is required")

    // Read file text
    const text = await file.text()
    
    // Parse CSV
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (parsed.errors.length > 0) {
      console.warn("Parse errors:", parsed.errors)
    }

    const rows = parsed.data as Record<string, any>[]
    if (rows.length === 0) throw new Error("No data found in CSV")

    // 1. Create Prospect List
    const { data: listData, error: listError } = await supabase
      .from('prospect_lists')
      .insert({
        user_id: user.id,
        name: listName,
        source_file: file.name,
        total_count: rows.length,
        status: 'completed' // For now, we process immediately
      })
      .select()
      .single()

    if (listError) throw new Error(`List creation failed: ${listError.message}`)

    // 2. Map and Insert Leads
    const leadsToInsert = rows.map((row) => ({
      user_id: user.id,
      prospect_list_id: listData.id,
      email: row.email || row.Email || row.EMAIL,
      first_name: row.first_name || row.firstName || row['First Name'] || row.First_Name,
      last_name: row.last_name || row.lastName || row['Last Name'] || row.Last_Name,
      company_name: row.company_name || row.company || row.Company || row['Company Name'],
      job_title: row.job_title || row.title || row.Title || row['Job Title'],
      status: 'pending' // Leads from bulk upload start as pending for evaluation
    })).filter(l => !!l.email) // filter out rows without email

    // Batch insert with upsert (ignore if email exists for user)
    const { error: insertError } = await supabase
      .from('leads')
      .upsert(leadsToInsert, { 
        onConflict: 'user_id, email', 
        ignoreDuplicates: true 
      })

    if (insertError) {
      // Mark list as failed if insert fails
      await supabase.from('prospect_lists').update({ status: 'failed' }).eq('id', listData.id)
      throw new Error(`Lead insert failed: ${insertError.message}`)
    }

    // Update list count based on valid emails
    await supabase.from('prospect_lists').update({ 
      processed_count: leadsToInsert.length 
    }).eq('id', listData.id)

    // Audit Log
    await supabase.from('agent_audit_trail').insert({
      user_id: user.id,
      agent_name: 'Bulk Uploader',
      action: 'csv_parsed',
      details: { 
        file_name: file.name, 
        total_rows: rows.length,
        valid_leads: leadsToInsert.length
      }
    })

    return new Response(
      JSON.stringify({ success: true, list: listData, inserted: leadsToInsert.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
