# LOVED & KNOWN — Doména, hosting, Stripe, právní texty

**Produkt:** LOVED & KNOWN  
**Účel:** Ops / business checklist před produkcí (ne technický audit).  
**Hosting rozhodnutí:** Railway  
**V aplikaci (draft):** [`/privacy`](/privacy), [`/terms`](/terms) — Nápověda → odkazy  
**Šablony pro counsel:** [`docs/legal/`](./legal/) (brief + Privacy + Terms CZ)  
**Související:** [LAUNCH-01-SCOPE.md](./LAUNCH-01-SCOPE.md) · [LAUNCH-READINESS-AUDIT.md](./LAUNCH-READINESS-AUDIT.md) · [NODE-PRISMA-BACKEND.md](./NODE-PRISMA-BACKEND.md)

---

## 1. Doména

| Položka | Hodnota |
|---------|---------|
| Produkční URL (apex) | `[TODO: např. lovedandknown.cz]` |
| WWW / redirect | `[TODO: www → apex nebo naopak]` |
| Registrátor DNS | `[TODO]` |
| DNS záznamy (CNAME/A → Railway) | `[TODO po vytvoření Railway projektu]` |
| Support e-mail na doméně | `[TODO: např. support@…]` |

**Poznámka:** GitHub Pages (`/petly/`) zůstává jen **DEMO / marketing**. Produkční app + API neběží na Pages.

---

## 2. Hosting — Railway

**Rozhodnutí:** produkční stack na **Railway** (web + Fastify API + Postgres).

| Služba | Stav |
|--------|------|
| Web (Vite build / static nebo Node serve) | `[TODO: Railway service]` |
| API (Fastify, `server/`) | `[TODO: Railway service]` |
| PostgreSQL | Runbook [LAUNCH-06-POSTGRES-BACKUPS.md](./LAUNCH-06-POSTGRES-BACKUPS.md); plugin `[TODO: Railway project URL]` |
| Object storage (S3-compatible, dokumenty) | `[TODO: bucket + klíče; upload disabled do malware scanneru]` |
| `ALLOWED_ORIGINS` | `[TODO: produkční URL]` |
| `DATABASE_URL` / `SESSION_SECRET` | `[TODO: Railway secrets — nikdy VITE_]` |

**Proč ne GitHub Pages pro produkci:** žádné serverové auth, DB, cookies, webhooks.  
**Proč ne teď Fly/VPS:** Railway = nejrychlejší shoda s Node+Prisma plánem; změna později možná, ale jedna cesta teď.

Živé Stripe / Connect = **post-launch** (viz LAUNCH-01). Deploy Railway ≠ zapnutí plateb.

---

## 3. Firemní údaje pro Stripe

Vyplň před Stripe Account / Connect onboarding. Agent **nevymýšlí** IČO.

| Položka | Hodnota |
|---------|---------|
| Právní název | `[TODO]` |
| Právní forma | `[TODO: s.r.o. / OSVČ / …]` |
| IČO | `[TODO]` |
| DIČ (pokud má) | `[TODO]` |
| Sídlo / adresa | `[TODO]` |
| Země | `[TODO: CZ]` |
| Jednatel / zástupce (jméno) | `[TODO]` |
| Bankovní účet (IBAN) | `[TODO]` |
| Web | `[TODO: produkční URL]` |
| Support e-mail | `[TODO]` |
| Telefon (Stripe KYC) | `[TODO]` |
| Role platformy | Platform (booking fee) + později Connect pro výplaty profesionálů |
| Stripe režim teď | **DEMO / vypnuto** — live až post-launch |

---

## 4. Právní texty

| Dokument | Stav | Kde |
|----------|------|-----|
| Brief pro counsel | Šablona | [`docs/legal/LAWYER-BRIEF-CZ.md`](./legal/LAWYER-BRIEF-CZ.md) |
| Zásady ochrany osobních údajů (Privacy) | Šablona + draft v app — **čeká counsel** | [`docs/legal/PRIVACY-POLICY-CZ.md`](./legal/PRIVACY-POLICY-CZ.md) · `/privacy` |
| Obchodní podmínky (Terms) | Šablona + draft v app — **čeká counsel** | [`docs/legal/TERMS-OF-SERVICE-CZ.md`](./legal/TERMS-OF-SERVICE-CZ.md) · `/terms` |
| Cookies | Minimálně zmínka v Privacy; samostatný banner = později | — |
| GDPR kontakt / DPO | `[TODO: e-mail]` | Privacy šablona |
| Právní review counsel | `[TODO: nehotovo]` | — |

**Pravidlo:** text v app i v `docs/legal/` je **NÁVRH — není právní rada**. Ostrý provoz až po schválení právníkem a doplnění firemních údajů výše. Badge NÁVRH v `/privacy` a `/terms` neodstraňovat před counsel.

---

## 5. Pořadí prací (stručně)

1. Vyplnit doménu + firmu (tabulky výše).  
2. Railway: Postgres + API + web + secrets (Postgres: LAUNCH-06).  
3. Schválit Privacy/Terms (šablony v `docs/legal/` → nahradit placeholdery, counsel sign-off, pak sundat NÁVRH v app).  
4. Až potom: Stripe live + webhooks (ne dřív).
