-- Migration: add_missing_columns_to_cold_emails
-- Task: Fix schema issues causing data loading errors on Cold Emails page.

ALTER TABLE public.cold_emails 
ADD COLUMN IF NOT EXISTS lead_name text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS personalization_notes text;

-- Add index for performance on status if not already covered
CREATE INDEX IF NOT EXISTS cold_emails_status_idx ON public.cold_emails (status);
