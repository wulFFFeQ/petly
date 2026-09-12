# LOVED & KNOWN — Managed PostgreSQL + zálohy (Railway)

**Produkt:** LOVED & KNOWN  
**Účel:** Runbook pro produkční managed Postgres a zálohy.  
**Rozhodnutí:** Railway Postgres (viz [LAUNCH-04-OPS-LEGAL.md](./LAUNCH-04-OPS-LEGAL.md))  
**Schema:** [`server/prisma/`](../server/prisma/) · lokální setup: [NODE-PRISMA-BACKEND.md](./NODE-PRISMA-BACKEND.md)

> Agent **nevytvoří** cloudovou DB bez tvého Railway projektu. Níže jsou kroky, které provedeš v dashboardu.

---

## Cíle obnovy (default)

| Metrika | Cíl |
|---------|-----|
| **RPO** | ≤ 24 h (denní managed backup) |
| **RTO** | ≤ 4 h (manuální restore + ověření) |

Po změně plánu Railway (PITR) můžeš RPO zpřísnit — zapiš novou hodnotu sem.

---

## 1. Založit managed Postgres na Railway

1. Railway → Project (nebo nový) → **New** → **Database** → **PostgreSQL**.  
2. Počkej na provision.  
3. Variables / Connect: zkopíruj **`DATABASE_URL`** (nebo `POSTGRES_URL` — sjednoť na `DATABASE_URL` v API service).  
4. Projekt / DB URL: `[TODO: Railway project URL]`  
5. Region: `[TODO: např. EU]`

**API service secrets (nikdy `VITE_`):**

| Variable | Poznámka |
|----------|----------|
| `DATABASE_URL` | Connection string z Postgres pluginu (TLS dle Railway) |
| `SESSION_SECRET` | Dlouhý random |
| `ALLOWED_ORIGINS` | Produkční web origin |

Reference z Postgres service do API: Railway **Variable Reference** / shared variables.

---

## 2. Automatické zálohy Railway

1. Otevři Postgres service → **Backups** / **Settings** (název UI dle aktuálního Railway).  
2. Zapni / ověř **automatic backups** (typicky denní).  
3. Pokud je k dispozici **PITR / point-in-time**, zapni dle tarifu a poznamenej: `[TODO: ano/ne]`.  
4. Retention: `[TODO: např. 7 dní]`  

**Checklist (zaškrtni u sebe):**

- [ ] Automatic backups zapnuté  
- [ ] Retention známá  
- [ ] Víš, kde je tlačítko **Restore** v dashboardu  

---

## 3. Doplňková offsite záloha (`pg_dump`)

Frekvence: **týdně** (nebo denně u produkčních dat). Cíl: privátní bucket / offline disk — ne git.

```bash
# Vyžaduje pg_dump v PATH (PostgreSQL client tools)
set DATABASE_URL=postgresql://...   # PowerShell: $env:DATABASE_URL="..."
npm run db:backup
```

Skript: [`scripts/pg-dump-backup.mjs`](../scripts/pg-dump-backup.mjs) → soubor do `backups/` (gitignored).

Pak zkopíruj `.dump` / `.sql.gz` do S3-compatible bucketu `[TODO: bucket]`.

---

## 4. Migrace schématu

Proti **produkční** (nebo staging) URL:

```bash
# Root convenience (reads server DATABASE_URL / server/.env)
npm run db:migrate:deploy

# Or:
cd server
# DATABASE_URL musí ukazovat na Railway Postgres (staging default; prod jen záměrně)
npx prisma migrate deploy
npx prisma migrate status
```

Lokální vývoj dál: `npx prisma migrate dev` + lokální Postgres (`server/.env.example`).

**2026-09-12:** `migrate deploy` **BLOKOVÁNO** — chybí `server/.env` i env `DATABASE_URL`. Po doplnění Railway connection stringu znovu: `npm run db:migrate:deploy`.

---

## 5. Restore drill (proveď 1× a zapiš datum)

Cíl: ověřit, že umíš obnovit data dřív, než to bude potřeba.

1. Vytvoř **staging** Postgres na Railway (nebo dočasnou DB).  
2. Obnov buď Railway backup UI, nebo:

```bash
# Příklad — přizpůsob formátu dump ze skriptu
pg_restore --clean --if-exists -d "$DATABASE_URL_STAGING" backups/….dump
# nebo: psql "$DATABASE_URL_STAGING" < backups/….sql
```

3. Spusť API proti staging URL.  
4. Ověř: `GET /health`, existence tabulek (`accounts`, `sessions`, …), přihlášení pokud už auth běží.  
5. Datum drillu: `[TODO: YYYY-MM-DD]` · Výsledek: `[TODO: OK / poznámky]`

---

## 6. Bezpečnost

- Nikdy necommituj `.env` ani `backups/`.  
- Preferuj Railway private networking mezi API a DB, pokud je dostupné.  
- Connection string s TLS dle dokumentace Railway.  
- Přístup k dashboardu a dump souborům jen pro provozovatele.

---

## 7. Stav

| Položka | Stav |
|---------|------|
| Railway Postgres plugin | `[TODO: vytvořit]` |
| Automatic backups | `[TODO: ověřit]` |
| `DATABASE_URL` v API | `[TODO]` |
| `prisma migrate deploy` | **BLOKOVÁNO 2026-09-12** — chybí `DATABASE_URL` / `server/.env` |
| Offsite `pg_dump` | Skript ready · cron/bucket `[TODO]` |
| Restore drill | `[TODO]` |
