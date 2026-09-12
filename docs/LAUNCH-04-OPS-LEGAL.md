# LOVED & KNOWN — Doména, hosting, Stripe, právní texty

**Produkt:** LOVED & KNOWN  
**Účel:** Ops / business checklist před produkcí (ne technický audit).  
**Hosting rozhodnutí:** Vedos VPS (Railway ne)  
**V aplikaci (draft):** [`/privacy`](/privacy), [`/terms`](/terms) — Nápověda → odkazy  
**Šablony pro counsel:** [`docs/legal/`](./legal/) (brief + Privacy + Terms CZ)  
**Související:** [LAUNCH-01-SCOPE.md](./LAUNCH-01-SCOPE.md) · [LAUNCH-READINESS-AUDIT.md](./LAUNCH-READINESS-AUDIT.md) · [NODE-PRISMA-BACKEND.md](./NODE-PRISMA-BACKEND.md) · [LAUNCH-06-POSTGRES-BACKUPS.md](./LAUNCH-06-POSTGRES-BACKUPS.md) · [LAUNCH-07-HTTPS-CORS-COOKIES.md](./LAUNCH-07-HTTPS-CORS-COOKIES.md)

---

## 1. Doména

| Položka | Hodnota |
|---------|---------|
| Produkční URL (apex) | `[TODO: např. lovedandknown.cz]` |
| WWW / redirect | `[TODO: www → apex nebo naopak]` |
| Registrátor DNS | `[TODO]` |
| DNS záznamy (A/AAAA → Vedos VPS) | `[TODO po přidělení IP]` |
| Support e-mail na doméně | `[TODO: např. support@…]` |

**Poznámka:** GitHub Pages (`/petly/`) zůstává jen **DEMO / marketing**. Produkční app + API neběží na Pages.

---

## 2. Hosting — Vedos VPS

**Rozhodnutí:** produkční stack na **Vedos VPS** (web + Fastify API + Postgres na VPS). **Railway nepoužíváme.**

| Služba | Stav |
|--------|------|
| Web (Vite build / Node + reverse proxy) | `[TODO: Vedos VPS]` |
| API (Fastify, `server/`) | `[TODO: stejný VPS]` |
| PostgreSQL | Self-hosted na VPS — [LAUNCH-06-POSTGRES-BACKUPS.md](./LAUNCH-06-POSTGRES-BACKUPS.md); `[TODO: hostname]` |
| Zálohy | Vedos interní denní / externí týdenní (doplňková služba) + `pg_dump` |
| Object storage (S3-compatible, dokumenty) | `[TODO: bucket nebo disk na VPS; upload disabled do malware scanneru]` |
| `ALLOWED_ORIGINS` | `[TODO: https://produkční-doména — viz LAUNCH-07]` |
| `DATABASE_URL` / `SESSION_SECRET` / `COOKIE_SECURE` | `[TODO: env na VPS — nikdy VITE_; Secure v produkci]` |
| HTTPS (Caddy) | [LAUNCH-07-HTTPS-CORS-COOKIES.md](./LAUNCH-07-HTTPS-CORS-COOKIES.md) — `[TODO: nasadit]` |

**Proč ne GitHub Pages pro produkci:** žádné serverové auth, DB, cookies, webhooks.  
**Proč ne Railway:** provoz na vlastním Vedos VPS se provider zálohami (ověřeno v [VEDOS KB](https://kb.vedos.cz/vps-ssd-doplnkove-sluzby/)).

Živé Stripe / Connect = **post-launch** (viz LAUNCH-01). Deploy VPS ≠ zapnutí plateb.

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
2. Vedos VPS: Postgres + API + web + secrets + Vedos zálohy (Postgres: LAUNCH-06; HTTPS/CORS/cookies: LAUNCH-07).  
3. Schválit Privacy/Terms (šablony v `docs/legal/` → nahradit placeholdery, counsel sign-off, pak sundat NÁVRH v app).  
4. Až potom: Stripe live + webhooks (ne dřív).
