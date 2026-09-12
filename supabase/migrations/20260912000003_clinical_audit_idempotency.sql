-- LAUNCH 02 — clinical SSOT, documents metadata, audit, idempotency

CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  date date,
  notes text,
  status text,
  version integer NOT NULL DEFAULT 1,
  encounter_id uuid,
  created_by_account_id uuid REFERENCES public.accounts (id),
  record_source text,
  withdrawn_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX health_records_pet_id_idx ON public.health_records (pet_id);
CREATE INDEX health_records_created_at_idx ON public.health_records (created_at);
CREATE INDEX health_records_type_idx ON public.health_records (type);

CREATE TRIGGER health_records_set_updated_at
  BEFORE UPDATE ON public.health_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.health_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.health_records (id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_id, version)
);

CREATE INDEX health_record_versions_record_id_idx ON public.health_record_versions (record_id);

CREATE TABLE public.weight_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  weight numeric NOT NULL,
  version integer NOT NULL DEFAULT 1,
  encounter_id uuid,
  created_by_account_id uuid REFERENCES public.accounts (id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX weight_measurements_pet_id_idx ON public.weight_measurements (pet_id);
CREATE INDEX weight_measurements_created_at_idx ON public.weight_measurements (created_at);

CREATE TRIGGER weight_measurements_set_updated_at
  BEFORE UPDATE ON public.weight_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.clinical_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  status text NOT NULL,
  encounter_type text,
  started_at timestamptz,
  ended_at timestamptz,
  professional_id uuid REFERENCES public.professional_profiles (id),
  organization_id uuid REFERENCES public.organizations (id),
  booking_id uuid REFERENCES public.bookings (id),
  version integer NOT NULL DEFAULT 1,
  created_by_account_id uuid REFERENCES public.accounts (id),
  withdrawn_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clinical_encounters_pet_id_idx ON public.clinical_encounters (pet_id);
CREATE INDEX clinical_encounters_professional_id_idx ON public.clinical_encounters (professional_id);
CREATE INDEX clinical_encounters_booking_id_idx ON public.clinical_encounters (booking_id);
CREATE INDEX clinical_encounters_status_idx ON public.clinical_encounters (status);

CREATE TRIGGER clinical_encounters_set_updated_at
  BEFORE UPDATE ON public.clinical_encounters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.health_records
  ADD CONSTRAINT health_records_encounter_id_fkey
  FOREIGN KEY (encounter_id) REFERENCES public.clinical_encounters (id) ON DELETE SET NULL;

ALTER TABLE public.weight_measurements
  ADD CONSTRAINT weight_measurements_encounter_id_fkey
  FOREIGN KEY (encounter_id) REFERENCES public.clinical_encounters (id) ON DELETE SET NULL;

CREATE TABLE public.clinical_encounter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters (id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (encounter_id, version)
);

CREATE INDEX clinical_encounter_versions_encounter_id_idx
  ON public.clinical_encounter_versions (encounter_id);

CREATE TABLE public.pet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  category text,
  document_type text,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  storage_key text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  encounter_id uuid REFERENCES public.clinical_encounters (id) ON DELETE SET NULL,
  created_by_account_id uuid REFERENCES public.accounts (id),
  withdrawn_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_documents_no_public_permanent_url CHECK (is_public = false)
);

CREATE INDEX pet_documents_pet_id_idx ON public.pet_documents (pet_id);
CREATE INDEX pet_documents_storage_key_idx ON public.pet_documents (storage_key);
CREATE INDEX pet_documents_created_at_idx ON public.pet_documents (created_at);

CREATE TRIGGER pet_documents_set_updated_at
  BEFORE UPDATE ON public.pet_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pet_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.pet_documents (id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

CREATE INDEX pet_document_versions_document_id_idx ON public.pet_document_versions (document_id);

-- K48 audit events
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'authorization_decision',
  actor_account_id uuid,
  actor_type text,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  action text NOT NULL,
  result text NOT NULL CHECK (result IN ('allow', 'deny')),
  reason_code text,
  deny_code text,
  deny_class text,
  organization_id uuid,
  professional_id uuid,
  membership_id uuid,
  grant_id uuid,
  permission text,
  allow_path text,
  correlation_id text,
  request_id text,
  idempotency_ref text,
  source text,
  authority text NOT NULL CHECK (authority IN ('demo', 'server')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_actor_account_id_idx ON public.audit_events (actor_account_id);
CREATE INDEX audit_events_resource_idx ON public.audit_events (resource_type, resource_id);
CREATE INDEX audit_events_created_at_idx ON public.audit_events (created_at);
CREATE INDEX audit_events_correlation_id_idx ON public.audit_events (correlation_id);

-- K63 idempotency — atomic scope + fingerprint
CREATE TABLE public.idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  actor_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  operation text NOT NULL,
  resource_ref text NOT NULL,
  client_key text NOT NULL,
  fingerprint text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'completed', 'failed')),
  result jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_account_id, operation, resource_ref, client_key)
);

CREATE INDEX idempotency_records_actor_account_id_idx ON public.idempotency_records (actor_account_id);
CREATE INDEX idempotency_records_created_at_idx ON public.idempotency_records (created_at);

CREATE TRIGGER idempotency_records_set_updated_at
  BEFORE UPDATE ON public.idempotency_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
