# LAUNCH 03 — Supabase setup checklist

**Status gate:** dokud nejsou credentials v `.env.local` + Edge secrets, platí:

`PRODUCTION CONNECTION NOT CONFIGURED`

Nikdy nevkládej secrets do chatu, README, gitu, `VITE_*` server keys, localStorage, URL ani logů.

---

## HARD STOP — tvůj krok

1. Vytvoř **3 oddělené** Supabase projekty (nikdy nesdílej production secrets s dev):
   - `loved-and-known-dev`
   - `loved-and-known-staging`
   - `loved-and-known-prod` (zatím **nedeployuj** veřejně)

2. V každém projektu (začni **dev**):

### Auth
- Authentication → Providers → Email ON
- Confirm email: OFF (dev); staging dle potřeby
- URL configuration:
  - Site URL: `http://localhost:5173` (dev)
  - Redirect URLs: `http://localhost:5173`, `http://localhost:5173/**`
- Signup enabled; social/MFA OFF (deferred)

### Database
```bash
npx supabase login
npx supabase link --project-ref <DEV_PROJECT_REF>
npx supabase db push
```
Očekávané migrace (v pořadí):
1. `20260912000001_core_identity_grants.sql`
2. `20260912000002_booking_messaging_commerce.sql`
3. `20260912000003_clinical_audit_idempotency.sql`
4. `20260912000004_rls_policies.sql`
5. `20260912000005_storage_pet_documents.sql`
6. `20260912000006_pets_withdrawn.sql`

Ověř: trigger `handle_new_auth_user`, RLS enabled, bucket `pet-documents` (private).

### Edge Functions
```bash
npx supabase functions deploy pets
npx supabase functions deploy access
npx supabase functions deploy clinical
npx supabase functions deploy documents
npx supabase functions deploy messaging
npx supabase functions deploy bookings
npx supabase functions deploy notifications
npx supabase functions deploy public
```

### Edge secrets (server only — never VITE_)
```bash
npx supabase secrets set SUPABASE_URL=https://<ref>.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=<anon>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
npx supabase secrets set ALLOWED_ORIGINS=http://localhost:5173
```

### Client `.env.local` (gitignored)
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_PAYMENT_PROVIDER=demo
```

**NE** do `.env.local`: `SUPABASE_SERVICE_ROLE_KEY`, DB password, JWT secret, Stripe secrets.

3. Napiš agentovi **jen**:

`Phase B done — .env.local and Edge secrets set for dev`

(bez hodnot klíčů)

---

## Po potvrzení (Phase C)

Agent ověří gate, smoke AUTH/PET/CLINICAL/… a vydá verdikt READY FOR STAGING nebo BLOCKED.

Staging = opakovat stejný checklist na `loved-and-known-staging` s staging host origin v `ALLOWED_ORIGINS`.
