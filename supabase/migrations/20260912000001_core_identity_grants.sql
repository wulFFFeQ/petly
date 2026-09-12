-- LAUNCH 02 — core identity, pets, household/pro/org grants
-- Domain SSOT: Account, Pet, PetHouseholdAccess, Organization*, Professional*, PetProfessionalAccess

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- accounts (id = auth.users.id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('consumer', 'professional')),
  roles text[] NOT NULL DEFAULT '{}',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX accounts_created_at_idx ON public.accounts (created_at);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create application account on signup (never trust client accountId)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (id, kind, roles, display_name)
  VALUES (
    NEW.id,
    'consumer',
    ARRAY['owner']::text[],
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------
CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  name text NOT NULL,
  type text NOT NULL,
  breed text,
  image text,
  sex text,
  birth_date date,
  weight numeric,
  microchip text,
  found_contact_token text,
  emergency_card jsonb,
  breeding jsonb,
  privacy jsonb,
  connection_preferences jsonb,
  lost_lifecycle text,
  public_slug text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pets_owner_account_id_idx ON public.pets (owner_account_id);
CREATE INDEX pets_created_at_idx ON public.pets (created_at);
CREATE UNIQUE INDEX pets_public_slug_uidx ON public.pets (public_slug) WHERE public_slug IS NOT NULL;

CREATE TRIGGER pets_set_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- household grants (no separate Household aggregate)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pet_household_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('co_owner', 'caregiver', 'viewer')),
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  granted_by_account_id uuid NOT NULL REFERENCES public.accounts (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pet_id, account_id)
);

CREATE INDEX pet_household_access_account_id_idx ON public.pet_household_access (account_id);
CREATE INDEX pet_household_access_pet_id_idx ON public.pet_household_access (pet_id);
CREATE INDEX pet_household_access_status_idx ON public.pet_household_access (status);

CREATE TRIGGER pet_household_access_set_updated_at
  BEFORE UPDATE ON public.pet_household_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pet_household_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pet_household_access_logs_pet_id_idx ON public.pet_household_access_logs (pet_id);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  legal_name text,
  organization_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'suspended', 'closed')),
  public_visibility text NOT NULL CHECK (public_visibility IN ('public', 'private')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organizations_status_idx ON public.organizations (status);

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'professional', 'staff', 'viewer')),
  status text NOT NULL CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by_account_id uuid REFERENCES public.accounts (id),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, account_id)
);

CREATE INDEX organization_memberships_account_id_idx ON public.organization_memberships (account_id);
CREATE INDEX organization_memberships_organization_id_idx ON public.organization_memberships (organization_id);
CREATE INDEX organization_memberships_status_idx ON public.organization_memberships (status);

CREATE TRIGGER organization_memberships_set_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.organization_pet_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  visibility_mode text NOT NULL CHECK (visibility_mode IN ('assigned_only', 'role_eligible')),
  eligible_roles text[],
  assigned_account_ids uuid[],
  location_id text,
  requested_at timestamptz,
  requested_by_account_id uuid REFERENCES public.accounts (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by_account_id uuid NOT NULL REFERENCES public.accounts (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pet_id, organization_id)
);

CREATE INDEX organization_pet_access_pet_id_idx ON public.organization_pet_access (pet_id);
CREATE INDEX organization_pet_access_organization_id_idx ON public.organization_pet_access (organization_id);
CREATE INDEX organization_pet_access_status_idx ON public.organization_pet_access (status);

CREATE TRIGGER organization_pet_access_set_updated_at
  BEFORE UPDATE ON public.organization_pet_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- professional profiles + access
-- ---------------------------------------------------------------------------
CREATE TABLE public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  type text NOT NULL,
  display_name text NOT NULL,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  organization_name text,
  description text,
  phone text,
  email text,
  address text,
  website text,
  city text,
  specializations text[],
  hours_summary text,
  professional_credentials jsonb,
  profile_photo_url text,
  logo_url text,
  services text[],
  public_visibility text NOT NULL DEFAULT 'private'
    CHECK (public_visibility IN ('public', 'private')),
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX professional_profiles_account_id_idx ON public.professional_profiles (account_id);
CREATE INDEX professional_profiles_organization_id_idx ON public.professional_profiles (organization_id);

CREATE TRIGGER professional_profiles_set_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pet_professional_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  requested_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by_account_id uuid NOT NULL REFERENCES public.accounts (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pet_id, professional_id)
);

CREATE INDEX pet_professional_access_pet_id_idx ON public.pet_professional_access (pet_id);
CREATE INDEX pet_professional_access_professional_id_idx ON public.pet_professional_access (professional_id);
CREATE INDEX pet_professional_access_status_idx ON public.pet_professional_access (status);

CREATE TRIGGER pet_professional_access_set_updated_at
  BEFORE UPDATE ON public.pet_professional_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.professional_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX professional_access_logs_pet_id_idx ON public.professional_access_logs (pet_id);
CREATE INDEX professional_access_logs_professional_id_idx ON public.professional_access_logs (professional_id);
