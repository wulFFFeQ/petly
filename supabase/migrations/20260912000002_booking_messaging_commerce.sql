-- LAUNCH 02 — booking, messaging, notifications, membership, payments, reviews

CREATE TABLE public.professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric,
  currency text,
  price_type text,
  public_visibility text NOT NULL DEFAULT 'private'
    CHECK (public_visibility IN ('public', 'private')),
  location_type text,
  payment_collection text,
  deposit_type text,
  deposit_value numeric,
  active boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX professional_services_professional_id_idx ON public.professional_services (professional_id);

CREATE TRIGGER professional_services_set_updated_at
  BEFORE UPDATE ON public.professional_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.professional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX professional_availability_professional_id_idx
  ON public.professional_availability (professional_id);

CREATE TRIGGER professional_availability_set_updated_at
  BEFORE UPDATE ON public.professional_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.professional_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  kind text NOT NULL DEFAULT 'blocked',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX professional_availability_exceptions_professional_id_idx
  ON public.professional_availability_exceptions (professional_id);

CREATE TRIGGER professional_availability_exceptions_set_updated_at
  BEFORE UPDATE ON public.professional_availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.professional_booking_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL UNIQUE REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER professional_booking_policies_set_updated_at
  BEFORE UPDATE ON public.professional_booking_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.professional_services (id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'requested',
      'payment_pending',
      'confirmed',
      'declined',
      'cancelled_by_owner',
      'cancelled_by_professional',
      'completed',
      'no_show'
    )
  ),
  note text,
  service_name_snapshot text,
  pet_name text,
  professional_name text,
  owner_display_name text,
  price_snapshot numeric,
  currency_snapshot text,
  duration_snapshot integer,
  client_request_id text,
  cancelled_at timestamptz,
  cancellation_reason text,
  cancellation_reason_code text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  declined_at timestamptz,
  original_start_at timestamptz,
  original_end_at timestamptz,
  rescheduled_at timestamptz,
  no_show_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE INDEX bookings_owner_account_id_idx ON public.bookings (owner_account_id);
CREATE INDEX bookings_professional_id_idx ON public.bookings (professional_id);
CREATE INDEX bookings_pet_id_idx ON public.bookings (pet_id);
CREATE INDEX bookings_status_idx ON public.bookings (status);
CREATE INDEX bookings_start_at_idx ON public.bookings (start_at);
CREATE INDEX bookings_created_at_idx ON public.bookings (created_at);

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Conversations / messages — participant_account_ids is the ACL boundary
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type text,
  participant_account_ids uuid[] NOT NULL,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.professional_profiles (id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets (id) ON DELETE SET NULL,
  subject text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_participants_nonempty
    CHECK (cardinality(participant_account_ids) >= 2)
);

CREATE INDEX conversations_booking_id_idx ON public.conversations (booking_id);
CREATE INDEX conversations_created_at_idx ON public.conversations (created_at);
CREATE INDEX conversations_participants_gin_idx
  ON public.conversations USING gin (participant_account_ids);

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  text text,
  attachment jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX messages_created_at_idx ON public.messages (created_at);
CREATE INDEX messages_sender_account_id_idx ON public.messages (sender_account_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  dedupe_key text,
  related_ids jsonb,
  priority text,
  unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_account_id_idx ON public.notifications (recipient_account_id);
CREATE INDEX notifications_created_at_idx ON public.notifications (created_at);
CREATE UNIQUE INDEX notifications_recipient_dedupe_uidx
  ON public.notifications (recipient_account_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE public.subscription_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL,
  provider text NOT NULL DEFAULT 'demo',
  current_period_end timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscription_records_account_id_idx ON public.subscription_records (account_id);
CREATE INDEX subscription_records_status_idx ON public.subscription_records (status);

CREATE TRIGGER subscription_records_set_updated_at
  BEFORE UPDATE ON public.subscription_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  owner_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  professional_id uuid REFERENCES public.professional_profiles (id) ON DELETE SET NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'CZK',
  payment_type text,
  status text NOT NULL,
  purpose text,
  is_demo_payment boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'demo',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_owner_account_id_idx ON public.payments (owner_account_id);
CREATE INDEX payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX payments_status_idx ON public.payments (status);
CREATE INDEX payments_created_at_idx ON public.payments (created_at);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.professional_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles (id) ON DELETE CASCADE,
  author_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  status text NOT NULL,
  reply text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX professional_reviews_professional_id_idx ON public.professional_reviews (professional_id);
CREATE INDEX professional_reviews_author_account_id_idx ON public.professional_reviews (author_account_id);

CREATE TRIGGER professional_reviews_set_updated_at
  BEFORE UPDATE ON public.professional_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
