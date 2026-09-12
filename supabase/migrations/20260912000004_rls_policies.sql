-- LAUNCH 02 — RLS defense-in-depth
-- Application authorize() remains authoritative for sensitive mutations (Edge + service_role).
-- RLS never means: knows petId ⇒ access | org member ⇒ clinical | professional ⇒ all pets.

-- Helper: pet ownership
CREATE OR REPLACE FUNCTION public.is_pet_owner(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = p_pet_id AND p.owner_account_id = auth.uid()
  );
$$;

-- Helper: active household grant (permission-aware callers still use authorize on server)
CREATE OR REPLACE FUNCTION public.has_active_household_grant(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pet_household_access g
    WHERE g.pet_id = p_pet_id
      AND g.account_id = auth.uid()
      AND g.status = 'active'
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND g.revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_professional_grant(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pet_professional_access g
    JOIN public.professional_profiles pp ON pp.id = g.professional_id
    WHERE g.pet_id = p_pet_id
      AND pp.account_id = auth.uid()
      AND g.status = 'active'
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND g.revoked_at IS NULL
  );
$$;

-- Org membership alone NEVER grants clinical — requires effective org pet access + assignment
CREATE OR REPLACE FUNCTION public.has_effective_org_pet_grant(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_pet_access opa
    JOIN public.organization_memberships om
      ON om.organization_id = opa.organization_id
     AND om.account_id = auth.uid()
     AND om.status = 'active'
    WHERE opa.pet_id = p_pet_id
      AND opa.status = 'active'
      AND (opa.expires_at IS NULL OR opa.expires_at > now())
      AND opa.revoked_at IS NULL
      AND (
        (
          opa.visibility_mode = 'assigned_only'
          AND auth.uid() = ANY (opa.assigned_account_ids)
        )
        OR (
          opa.visibility_mode = 'role_eligible'
          AND om.role = ANY (
            COALESCE(opa.eligible_roles, ARRAY['professional']::text[])
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_pet_row(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_pet_owner(p_pet_id)
      OR public.has_active_household_grant(p_pet_id)
      OR public.has_active_professional_grant(p_pet_id)
      OR public.has_effective_org_pet_grant(p_pet_id);
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND cardinality(c.participant_account_ids) >= 2
      AND auth.uid() = ANY (c.participant_account_ids)
  );
$$;

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_household_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_household_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_pet_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_professional_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_booking_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_encounter_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

-- accounts: self only
CREATE POLICY accounts_select_self ON public.accounts
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY accounts_update_self ON public.accounts
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- pets: readable via real access paths; writes via Edge (service_role) primarily
CREATE POLICY pets_select_access ON public.pets
  FOR SELECT TO authenticated
  USING (public.can_read_pet_row(id));

CREATE POLICY pets_insert_owner ON public.pets
  FOR INSERT TO authenticated
  WITH CHECK (owner_account_id = auth.uid());

CREATE POLICY pets_update_owner ON public.pets
  FOR UPDATE TO authenticated
  USING (owner_account_id = auth.uid())
  WITH CHECK (owner_account_id = auth.uid());

-- household grants
CREATE POLICY household_select ON public.pet_household_access
  FOR SELECT TO authenticated
  USING (
    account_id = auth.uid()
    OR public.is_pet_owner(pet_id)
  );

CREATE POLICY household_logs_select ON public.pet_household_access_logs
  FOR SELECT TO authenticated
  USING (public.is_pet_owner(pet_id) OR account_id = auth.uid());

-- organizations: members can read own orgs; public orgs readable when public
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public_visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = organizations.id
        AND m.account_id = auth.uid()
        AND m.status IN ('active', 'invited')
    )
  );

CREATE POLICY organization_memberships_select ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (
    account_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships self
      WHERE self.organization_id = organization_memberships.organization_id
        AND self.account_id = auth.uid()
        AND self.status = 'active'
    )
  );

CREATE POLICY organization_pet_access_select ON public.organization_pet_access
  FOR SELECT TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR public.has_effective_org_pet_grant(pet_id)
  );

-- professional profiles
CREATE POLICY professional_profiles_select ON public.professional_profiles
  FOR SELECT TO authenticated
  USING (
    account_id = auth.uid()
    OR public_visibility = 'public'
  );

CREATE POLICY pet_professional_access_select ON public.pet_professional_access
  FOR SELECT TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

CREATE POLICY professional_access_logs_select ON public.professional_access_logs
  FOR SELECT TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

CREATE POLICY professional_services_select ON public.professional_services
  FOR SELECT TO authenticated
  USING (
    public_visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

CREATE POLICY professional_availability_select ON public.professional_availability
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id
        AND (pp.account_id = auth.uid() OR pp.public_visibility = 'public')
    )
  );

CREATE POLICY professional_availability_exceptions_select
  ON public.professional_availability_exceptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

CREATE POLICY professional_booking_policies_select
  ON public.professional_booking_policies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

-- bookings: owner or professional account
CREATE POLICY bookings_select ON public.bookings
  FOR SELECT TO authenticated
  USING (
    owner_account_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

-- messaging: participants only; missing participants denied by CHECK + this policy
CREATE POLICY conversations_select ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = ANY (participant_account_ids));

CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

-- notifications: recipient only
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_account_id = auth.uid());

CREATE POLICY notifications_update_self ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_account_id = auth.uid())
  WITH CHECK (recipient_account_id = auth.uid());

CREATE POLICY subscription_records_select ON public.subscription_records
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (
    owner_account_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.account_id = auth.uid()
    )
  );

CREATE POLICY professional_reviews_select ON public.professional_reviews
  FOR SELECT TO authenticated
  USING (
    author_account_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id
        AND (pp.account_id = auth.uid() OR pp.public_visibility = 'public')
    )
  );

-- clinical / documents: grant-based read; mutations via Edge service_role after authorize
CREATE POLICY health_records_select ON public.health_records
  FOR SELECT TO authenticated
  USING (public.can_read_pet_row(pet_id));

CREATE POLICY health_record_versions_select ON public.health_record_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.health_records hr
      WHERE hr.id = record_id AND public.can_read_pet_row(hr.pet_id)
    )
  );

CREATE POLICY weight_measurements_select ON public.weight_measurements
  FOR SELECT TO authenticated
  USING (public.can_read_pet_row(pet_id));

CREATE POLICY clinical_encounters_select ON public.clinical_encounters
  FOR SELECT TO authenticated
  USING (public.can_read_pet_row(pet_id));

CREATE POLICY clinical_encounter_versions_select ON public.clinical_encounter_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_encounters ce
      WHERE ce.id = encounter_id AND public.can_read_pet_row(ce.pet_id)
    )
  );

CREATE POLICY pet_documents_select ON public.pet_documents
  FOR SELECT TO authenticated
  USING (public.can_read_pet_row(pet_id));

CREATE POLICY pet_document_versions_select ON public.pet_document_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_documents d
      WHERE d.id = document_id AND public.can_read_pet_row(d.pet_id)
    )
  );

-- audit / idempotency: actor can read own rows only (writes via service_role)
CREATE POLICY audit_events_select_own ON public.audit_events
  FOR SELECT TO authenticated
  USING (actor_account_id = auth.uid());

CREATE POLICY idempotency_records_select_own ON public.idempotency_records
  FOR SELECT TO authenticated
  USING (actor_account_id = auth.uid());
