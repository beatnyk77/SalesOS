-- Migration: whatsapp_messages
-- Task 38: WhatsApp Nurturer Queue
-- Scope: Table to store dry-run messages for approval

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,
  message_body  text NOT NULL,
  status        text NOT NULL DEFAULT 'draft', -- draft, approved, sent, failed
  reasoning     text, -- Why the agent generated this specific message
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_messages_select_own" ON public.whatsapp_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "whatsapp_messages_insert_own" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "whatsapp_messages_update_own" ON public.whatsapp_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "whatsapp_messages_delete_own" ON public.whatsapp_messages
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER whatsapp_messages_set_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
