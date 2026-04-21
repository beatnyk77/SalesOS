import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables")
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Missing Authorization header")
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error("Unauthorized")
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const industry = formData.get('industry') as string
    const dealStage = formData.get('deal_stage') as string
    const documentType = formData.get('document_type') as string

    if (!file) {
      throw new Error("File is required")
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

    // 1. Upload to Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('collateral')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (storageError) {
      throw new Error(`Storage error: ${storageError.message}`)
    }

    // 2. Extract content (Mock for now, as per "basic parsing only")
    const extractedContent = `Mock extracted content for ${file.name}`

    // 3. Insert into marketing_collateral table
    const { data: dbData, error: dbError } = await supabase
      .from('marketing_collateral')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: storageData.path,
        content: extractedContent,
        metadata: {
          industry: industry || 'general',
          deal_stage: dealStage || 'all',
          document_type: documentType || 'other',
          tags: []
        }
      })
      .select()
      .single()

    if (dbError) {
      // Rollback storage if DB fails
      await supabase.storage.from('collateral').remove([storageData.path])
      throw new Error(`Database error: ${dbError.message}`)
    }
    
    // Log to audit trail
    await supabase.from('agent_audit_trail').insert({
      user_id: user.id,
      agent_name: 'Collateral Upload',
      action: 'upload',
      details: { file_name: file.name, file_path: storageData.path }
    });

    const { data: publicUrlData } = supabase.storage.from('collateral').getPublicUrl(storageData.path)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: dbData,
        file_url: publicUrlData.publicUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
