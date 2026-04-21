-- Migration: contracts
-- Task 45: Track generated contracts and closing status

CREATE TABLE IF NOT EXISTS public.contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  contract_type text NOT NULL DEFAULT 'standard_service_agreement',
  status        text NOT NULL DEFAULT 'draft', -- draft, sent, signed, cancelled
  terms         jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_value   numeric(12, 2),
  pdf_url       text, -- Store generated PDF path in storage (if implemented)
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select_own" ON public.contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_insert_own" ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_update_own" ON public.contracts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "contracts_delete_own" ON public.contracts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER contracts_set_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
