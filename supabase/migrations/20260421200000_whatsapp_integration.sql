-- Migration: whatsapp_integration
-- Task 37: Add WhatsApp support to leads
-- Scope: phone_number and opt-in flag

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;

-- Index for phone number searches
CREATE INDEX IF NOT EXISTS leads_phone_number_idx ON public.leads (phone_number);
