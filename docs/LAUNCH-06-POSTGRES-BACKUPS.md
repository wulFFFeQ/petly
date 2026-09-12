# LOVED & KNOWN — PostgreSQL + zálohy (Vedos VPS)

**Produkt:** LOVED & KNOWN  
**Účel:** Runbook pro Postgres na VPS a zálohy.  
**Rozhodnutí:** **Vedos VPS** — self-hosted Postgres na stejném (nebo odděleném) VPS; Railway **nepoužíváme**.  
**Schema:** [`server/prisma/`](../server/prisma/) · lokální setup: [NODE-PRISMA-BACKEND.md](./NODE-PRISMA-BACKEND.md)  
**Ops:** [LAUNCH-04-OPS-LEGAL.md](./LAUNCH-04-OPS-LEGAL.md)

> Agent **nenainstaluje** Postgres na tvůj VPS bez přístupu. Níže jsou kroky na serveru.

---

## Ověření Vedos záloh (2026-09-12)

Zdroj: [VEDOS KB — VPS SSD doplňkové služby](https://kb.vedos.cz/vps-ssd-doplnkove-sluzby/)

| Typ | Frekvence | Umístění |
|-----|-----------|----------|
| Interní záloha | 1× denně (přepis) | jiné disky na stejném hostiteli |
| Externí záloha | 1× týdně (přepis) | jiný server / rack |
| Interní snapshoty | dle objednávky (1–10) | jiné disky na stejném hostiteli |

Poznámky:
- U **VPS SSD** jsou zálohy **doplňková služba** (součást balíku Profi, nebo objednat zvlášť).  
- U **VPS ON** WEDOS uvádí týdenní zálohu pro havárii pole ([servery — manuál](https://kb.vedos.cz/servery-manual/)).  
- Obnova na žádost je zpoplatněná; Vedos připojí zálohu jako další disk — není to managed Postgres PITR.  
- **Doporučení:** mít aktivní alespoň **externí týdenní** (+ ideálně denní interní) **a** pravidelný `pg_dump` (konzistentní DB dump).

---

## Cíle obnovy (default)

| Metrika | Cíl |
|---------|-----|
| **RPO** | ≤ 24 h (Vedos denní interní) / ≤ 7 dní (externí týdenní) |
| **RTO** | ≤ 4 h (manuální restore + ověření; Vedos restore může trvat déle dle ticketu) |

---

## 1. Postgres na Vedos VPS

1. VPS: `[TODO: hostname / IP / plán SSD|ON]`  
2. Nainstaluj PostgreSQL (např. Ubuntu packages) a vytvoř DB + roli pro app.  
3. `DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/loved_and_known` (nebo TCP jen přes localhost / private).  
4. Env soubor na serveru (např. `/etc/lovedandknown/server.env`) — **nikdy do gitu**, nikdy `VITE_`.

**API secrets na VPS:**

| Variable | Poznámka |
|----------|----------|
| `DATABASE_URL` | Lokální Postgres na VPS |
| `SESSION_SECRET` | Dlouhý random |
| `ALLOWED_ORIGINS` | Produkční web origin |

---

## 2. Zálohy Vedos (provider)

1. V zákaznické administraci aktivuj **Zálohování interně (denně)** a/nebo **Zálohování externě (týdně)** — viz [KB](https://kb.vedos.cz/vps-ssd-doplnkove-sluzby/).  
2. Volitelně: interní snapshoty.  
3. Zapiš: `[TODO: které zálohy jsou aktivní]`  

**Checklist:**

- [ ] Interní denní aktivní (nebo Profi)  
- [ ] Externí týdenní aktivní  
- [ ] Víš, jak požádat o obnovu (formulář Vedos + poplatek)

---

## 3. Doplňková DB záloha (`pg_dump`)

Provider snapshot ≠ konzistentní Postgres dump. Frekvence: **denně nebo týdně** na VPS + kopie pryč z VPS.

```bash
# Na VPS (pg_dump v PATH)
export DATABASE_URL=postgresql://...
npm run db:backup
```

Skript: [`scripts/pg-dump-backup.mjs`](../scripts/pg-dump-backup.mjs) → `backups/` (gitignored).  
Cron: `[TODO: např. 0 3 * * *]` · offsite cíl: `[TODO: jiný disk / S3 / PC]`

---

## 4. Migrace schématu

```bash
# Z VPS nebo lokálně s DATABASE_URL na staging/prod
npm run db:migrate:deploy

cd server
npx prisma migrate deploy
npx prisma migrate status
```

Lokální vývoj: `npx prisma migrate dev` + `server/.env.example`.

**2026-09-12:** `migrate deploy` **BLOKOVÁNO** — chybí `server/.env` / `DATABASE_URL`. Po nasazení Postgres na Vedos: vytvoř `server/.env` (nebo server env) a spusť znovu.

---

## 5. Restore drill (1×)

1. Obnov Vedos zálohu (ticket) **nebo** `pg_restore` / `psql` z `pg_dump` do staging DB na VPS.  
2. Spusť API proti obnovené DB.  
3. Ověř: `GET /health`, tabulky `accounts` / `sessions`, login pokud běží.  
4. Datum: `[TODO]` · Výsledek: `[TODO]`

---

## 6. Bezpečnost

- Postgres naslouchá ideálně jen na `127.0.0.1` (API na stejném VPS).  
- Firewall: 5432 neexponovat do internetu.  
- Nikdy necommitovat `.env` / `backups/`.  
- TLS na reverse proxy (Caddy/Nginx) pro HTTPS.

---

## 7. Stav

| Položka | Stav |
|---------|------|
| Vedos VPS | `[TODO: objednáno / hostname]` |
| Postgres na VPS | `[TODO: nainstalovat]` |
| Vedos zálohy (interní/externí) | Ověřeno v KB — `[TODO: aktivovat]` |
| `DATABASE_URL` na API | `[TODO]` |
| `prisma migrate deploy` | **BLOKOVÁNO 2026-09-12** — chybí `DATABASE_URL` |
| `pg_dump` cron | Skript ready · cron `[TODO]` |
| Restore drill | `[TODO]` |
