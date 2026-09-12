-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "owner_account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "breed" TEXT,
    "image" TEXT,
    "sex" TEXT,
    "birth_date" DATE,
    "weight" DECIMAL,
    "microchip" TEXT,
    "found_contact_token" TEXT,
    "emergency_card" JSONB,
    "breeding" JSONB,
    "privacy" JSONB,
    "connection_preferences" JSONB,
    "lost_lifecycle" TEXT,
    "public_slug" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "withdrawn_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_household_access" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "granted_by_account_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "invited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_household_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_household_access_logs" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_household_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "organization_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "public_visibility" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "invited_by_account_id" UUID,
    "joined_at" TIMESTAMPTZ(6),
    "left_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_pet_access" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "visibility_mode" TEXT NOT NULL,
    "eligible_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigned_account_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "location_id" TEXT,
    "requested_at" TIMESTAMPTZ(6),
    "requested_by_account_id" UUID,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "granted_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pet_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "organization_id" UUID,
    "organization_name" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "website" TEXT,
    "city" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hours_summary" TEXT,
    "professional_credentials" JSONB,
    "profile_photo_url" TEXT,
    "logo_url" TEXT,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "public_visibility" TEXT NOT NULL DEFAULT 'private',
    "verification_status" TEXT NOT NULL DEFAULT 'unverified',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_professional_access" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6),
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "granted_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_professional_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_access_logs" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_services" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL,
    "currency" TEXT,
    "price_type" TEXT,
    "public_visibility" TEXT NOT NULL DEFAULT 'private',
    "location_type" TEXT,
    "payment_collection" TEXT,
    "deposit_type" TEXT,
    "deposit_value" DECIMAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_availability" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "timezone" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_availability_exceptions" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'blocked',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_booking_policies" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_booking_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "owner_account_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "service_name_snapshot" TEXT,
    "pet_name" TEXT,
    "professional_name" TEXT,
    "owner_display_name" TEXT,
    "price_snapshot" DECIMAL,
    "currency_snapshot" TEXT,
    "duration_snapshot" INTEGER,
    "client_request_id" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "cancellation_reason_code" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "original_start_at" TIMESTAMPTZ(6),
    "original_end_at" TIMESTAMPTZ(6),
    "rescheduled_at" TIMESTAMPTZ(6),
    "no_show_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "contact_type" TEXT,
    "participant_account_ids" UUID[],
    "booking_id" UUID,
    "professional_id" UUID,
    "pet_id" UUID,
    "subject" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_account_id" UUID NOT NULL,
    "text" TEXT,
    "attachment" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_account_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dedupe_key" TEXT,
    "related_ids" JSONB,
    "priority" TEXT,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_records" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'demo',
    "current_period_end" TIMESTAMPTZ(6),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID,
    "owner_account_id" UUID NOT NULL,
    "professional_id" UUID,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "payment_type" TEXT,
    "status" TEXT NOT NULL,
    "purpose" TEXT,
    "is_demo_payment" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'demo',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_reviews" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "author_account_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "reply" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "date" DATE,
    "notes" TEXT,
    "status" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "encounter_id" UUID,
    "created_by_account_id" UUID,
    "record_source" TEXT,
    "withdrawn_at" TIMESTAMPTZ(6),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_record_versions" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_record_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_measurements" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "measured_on" DATE NOT NULL,
    "weight" DECIMAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "encounter_id" UUID,
    "created_by_account_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_encounters" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "encounter_type" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "professional_id" UUID,
    "organization_id" UUID,
    "booking_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_account_id" UUID,
    "withdrawn_at" TIMESTAMPTZ(6),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_encounter_versions" (
    "id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_encounter_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_documents" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "category" TEXT,
    "document_type" TEXT,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "encounter_id" UUID,
    "created_by_account_id" UUID,
    "withdrawn_at" TIMESTAMPTZ(6),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'authorization_decision',
    "actor_account_id" UUID,
    "actor_type" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason_code" TEXT,
    "deny_code" TEXT,
    "deny_class" TEXT,
    "organization_id" UUID,
    "professional_id" UUID,
    "membership_id" UUID,
    "grant_id" UUID,
    "permission" TEXT,
    "allow_path" TEXT,
    "correlation_id" TEXT,
    "request_id" TEXT,
    "idempotency_ref" TEXT,
    "source" TEXT,
    "authority" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "actor_account_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "resource_ref" TEXT NOT NULL,
    "client_key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "result" JSONB,
    "error_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_created_at_idx" ON "accounts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_account_id_key" ON "credentials"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_email_key" ON "credentials"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_account_id_idx" ON "sessions"("account_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "pets_owner_account_id_idx" ON "pets"("owner_account_id");

-- CreateIndex
CREATE INDEX "pets_created_at_idx" ON "pets"("created_at");

-- CreateIndex
CREATE INDEX "pets_withdrawn_at_idx" ON "pets"("withdrawn_at");

-- CreateIndex
CREATE INDEX "pet_household_access_account_id_idx" ON "pet_household_access"("account_id");

-- CreateIndex
CREATE INDEX "pet_household_access_pet_id_idx" ON "pet_household_access"("pet_id");

-- CreateIndex
CREATE INDEX "pet_household_access_status_idx" ON "pet_household_access"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pet_household_access_pet_id_account_id_key" ON "pet_household_access"("pet_id", "account_id");

-- CreateIndex
CREATE INDEX "pet_household_access_logs_pet_id_idx" ON "pet_household_access_logs"("pet_id");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organization_memberships_account_id_idx" ON "organization_memberships"("account_id");

-- CreateIndex
CREATE INDEX "organization_memberships_organization_id_idx" ON "organization_memberships"("organization_id");

-- CreateIndex
CREATE INDEX "organization_memberships_status_idx" ON "organization_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organization_id_account_id_key" ON "organization_memberships"("organization_id", "account_id");

-- CreateIndex
CREATE INDEX "organization_pet_access_pet_id_idx" ON "organization_pet_access"("pet_id");

-- CreateIndex
CREATE INDEX "organization_pet_access_organization_id_idx" ON "organization_pet_access"("organization_id");

-- CreateIndex
CREATE INDEX "organization_pet_access_status_idx" ON "organization_pet_access"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_pet_access_pet_id_organization_id_key" ON "organization_pet_access"("pet_id", "organization_id");

-- CreateIndex
CREATE INDEX "professional_profiles_account_id_idx" ON "professional_profiles"("account_id");

-- CreateIndex
CREATE INDEX "professional_profiles_organization_id_idx" ON "professional_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "pet_professional_access_pet_id_idx" ON "pet_professional_access"("pet_id");

-- CreateIndex
CREATE INDEX "pet_professional_access_professional_id_idx" ON "pet_professional_access"("professional_id");

-- CreateIndex
CREATE INDEX "pet_professional_access_status_idx" ON "pet_professional_access"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pet_professional_access_pet_id_professional_id_key" ON "pet_professional_access"("pet_id", "professional_id");

-- CreateIndex
CREATE INDEX "professional_access_logs_pet_id_idx" ON "professional_access_logs"("pet_id");

-- CreateIndex
CREATE INDEX "professional_access_logs_professional_id_idx" ON "professional_access_logs"("professional_id");

-- CreateIndex
CREATE INDEX "professional_services_professional_id_idx" ON "professional_services"("professional_id");

-- CreateIndex
CREATE INDEX "professional_availability_professional_id_idx" ON "professional_availability"("professional_id");

-- CreateIndex
CREATE INDEX "professional_availability_exceptions_professional_id_idx" ON "professional_availability_exceptions"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_booking_policies_professional_id_key" ON "professional_booking_policies"("professional_id");

-- CreateIndex
CREATE INDEX "bookings_owner_account_id_idx" ON "bookings"("owner_account_id");

-- CreateIndex
CREATE INDEX "bookings_professional_id_idx" ON "bookings"("professional_id");

-- CreateIndex
CREATE INDEX "bookings_pet_id_idx" ON "bookings"("pet_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_start_at_idx" ON "bookings"("start_at");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "conversations_booking_id_idx" ON "conversations"("booking_id");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_sender_account_id_idx" ON "messages"("sender_account_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_account_id_idx" ON "notifications"("recipient_account_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "subscription_records_account_id_idx" ON "subscription_records"("account_id");

-- CreateIndex
CREATE INDEX "subscription_records_status_idx" ON "subscription_records"("status");

-- CreateIndex
CREATE INDEX "payments_owner_account_id_idx" ON "payments"("owner_account_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "professional_reviews_booking_id_key" ON "professional_reviews"("booking_id");

-- CreateIndex
CREATE INDEX "professional_reviews_professional_id_idx" ON "professional_reviews"("professional_id");

-- CreateIndex
CREATE INDEX "professional_reviews_author_account_id_idx" ON "professional_reviews"("author_account_id");

-- CreateIndex
CREATE INDEX "health_records_pet_id_idx" ON "health_records"("pet_id");

-- CreateIndex
CREATE INDEX "health_records_created_at_idx" ON "health_records"("created_at");

-- CreateIndex
CREATE INDEX "health_records_type_idx" ON "health_records"("type");

-- CreateIndex
CREATE INDEX "health_record_versions_record_id_idx" ON "health_record_versions"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_record_versions_record_id_version_key" ON "health_record_versions"("record_id", "version");

-- CreateIndex
CREATE INDEX "weight_measurements_pet_id_idx" ON "weight_measurements"("pet_id");

-- CreateIndex
CREATE INDEX "weight_measurements_created_at_idx" ON "weight_measurements"("created_at");

-- CreateIndex
CREATE INDEX "clinical_encounters_pet_id_idx" ON "clinical_encounters"("pet_id");

-- CreateIndex
CREATE INDEX "clinical_encounters_professional_id_idx" ON "clinical_encounters"("professional_id");

-- CreateIndex
CREATE INDEX "clinical_encounters_booking_id_idx" ON "clinical_encounters"("booking_id");

-- CreateIndex
CREATE INDEX "clinical_encounters_status_idx" ON "clinical_encounters"("status");

-- CreateIndex
CREATE INDEX "clinical_encounter_versions_encounter_id_idx" ON "clinical_encounter_versions"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_encounter_versions_encounter_id_version_key" ON "clinical_encounter_versions"("encounter_id", "version");

-- CreateIndex
CREATE INDEX "pet_documents_pet_id_idx" ON "pet_documents"("pet_id");

-- CreateIndex
CREATE INDEX "pet_documents_storage_key_idx" ON "pet_documents"("storage_key");

-- CreateIndex
CREATE INDEX "pet_documents_created_at_idx" ON "pet_documents"("created_at");

-- CreateIndex
CREATE INDEX "pet_document_versions_document_id_idx" ON "pet_document_versions"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "pet_document_versions_document_id_version_key" ON "pet_document_versions"("document_id", "version");

-- CreateIndex
CREATE INDEX "audit_events_actor_account_id_idx" ON "audit_events"("actor_account_id");

-- CreateIndex
CREATE INDEX "audit_events_resource_type_resource_id_idx" ON "audit_events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_storage_key_key" ON "idempotency_records"("storage_key");

-- CreateIndex
CREATE INDEX "idempotency_records_actor_account_id_idx" ON "idempotency_records"("actor_account_id");

-- CreateIndex
CREATE INDEX "idempotency_records_created_at_idx" ON "idempotency_records"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_actor_account_id_operation_resource_ref_key" ON "idempotency_records"("actor_account_id", "operation", "resource_ref", "client_key");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_household_access" ADD CONSTRAINT "pet_household_access_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_household_access" ADD CONSTRAINT "pet_household_access_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_household_access" ADD CONSTRAINT "pet_household_access_granted_by_account_id_fkey" FOREIGN KEY ("granted_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_household_access_logs" ADD CONSTRAINT "pet_household_access_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_household_access_logs" ADD CONSTRAINT "pet_household_access_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_pet_access" ADD CONSTRAINT "organization_pet_access_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_pet_access" ADD CONSTRAINT "organization_pet_access_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_pet_access" ADD CONSTRAINT "organization_pet_access_granted_by_account_id_fkey" FOREIGN KEY ("granted_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_pet_access" ADD CONSTRAINT "organization_pet_access_requested_by_account_id_fkey" FOREIGN KEY ("requested_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_professional_access" ADD CONSTRAINT "pet_professional_access_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_professional_access" ADD CONSTRAINT "pet_professional_access_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_professional_access" ADD CONSTRAINT "pet_professional_access_granted_by_account_id_fkey" FOREIGN KEY ("granted_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_access_logs" ADD CONSTRAINT "professional_access_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_access_logs" ADD CONSTRAINT "professional_access_logs_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_availability" ADD CONSTRAINT "professional_availability_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_availability_exceptions" ADD CONSTRAINT "professional_availability_exceptions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_booking_policies" ADD CONSTRAINT "professional_booking_policies_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "professional_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_account_id_fkey" FOREIGN KEY ("sender_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_account_id_fkey" FOREIGN KEY ("recipient_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_records" ADD CONSTRAINT "subscription_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_author_account_id_fkey" FOREIGN KEY ("author_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "clinical_encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_record_versions" ADD CONSTRAINT "health_record_versions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "health_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_measurements" ADD CONSTRAINT "weight_measurements_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_measurements" ADD CONSTRAINT "weight_measurements_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "clinical_encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_measurements" ADD CONSTRAINT "weight_measurements_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounter_versions" ADD CONSTRAINT "clinical_encounter_versions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "clinical_encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_documents" ADD CONSTRAINT "pet_documents_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_documents" ADD CONSTRAINT "pet_documents_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "clinical_encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_documents" ADD CONSTRAINT "pet_documents_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_document_versions" ADD CONSTRAINT "pet_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "pet_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

