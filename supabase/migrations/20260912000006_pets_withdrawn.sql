-- LAUNCH 03 — soft withdraw for pets (owner lifecycle)

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

CREATE INDEX IF NOT EXISTS pets_withdrawn_at_idx
  ON public.pets (withdrawn_at)
  WHERE withdrawn_at IS NULL;
