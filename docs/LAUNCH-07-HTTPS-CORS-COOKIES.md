# LOVED & KNOWN — HTTPS, CORS, Secure cookies (Vedos)

**Produkt:** LOVED & KNOWN  
**Hosting:** Vedos VPS (viz [LAUNCH-04-OPS-LEGAL.md](./LAUNCH-04-OPS-LEGAL.md))  
**Související:** [LAUNCH-03-SECURITY.md](./LAUNCH-03-SECURITY.md) · [LAUNCH-06-POSTGRES-BACKUPS.md](./LAUNCH-06-POSTGRES-BACKUPS.md)

---

## Cíl

| Vrstva | Produkce |
|--------|----------|
| HTTPS | Caddy (Let’s Encrypt) → reverse proxy na API / static |
| CORS | `ALLOWED_ORIGINS` = přesný `https://domena` (allowlist, credentials) |
| Session cookie `lk_session` | `HttpOnly` + `SameSite=Lax` + **`Secure`** |

---

## 1. HTTPS (Caddy na Vedos)

API poslouchá na `127.0.0.1:3001` (nebo `PORT`). Caddy terminuje TLS.

Příklad `Caddyfile` (uprav doménu a cesty):

```caddyfile
your-domain.cz {
  encode gzip

  handle /api/* {
    uri strip_prefix /api
    reverse_proxy 127.0.0.1:3001
  }

  handle {
    root * /var/www/lovedandknown
    try_files {path} /index.html
    file_server
  }
}
```

- DNS A/AAAA → IP Vedos VPS.  
- Caddy získá certifikát automaticky (Let’s Encrypt).  
- Klient: `VITE_API_BASE_URL=https://your-domain.cz/api` (nebo samostatný `api.` host — pak CORS origin = web origin).

**Checklist:**

- [ ] `https://your-domain.cz` načte web bez cert warning  
- [ ] API přes HTTPS (ne mixed content)

---

## 2. CORS allowlist

Server: `ALLOWED_ORIGINS` (comma-separated), `credentials: true`. Nikdy `*`.

```bash
# production
ALLOWED_ORIGINS=https://your-domain.cz
```

- Origin **bez** trailing slash.  
- `http://localhost:5173` jen pro local DEV.  
- Implementace: [`server/src/index.ts`](../server/src/index.ts), [`server/src/http.ts`](../server/src/http.ts) (`corsOrigin`).

**Checklist:**

- [ ] Request z povoleného origin + cookie funguje  
- [ ] Request z cizího origin (preflight / credentialed) je odmítnut

---

## 3. Secure session cookie

| Flag | Hodnota |
|------|---------|
| Name | `lk_session` |
| HttpOnly | ano |
| SameSite | `Lax` |
| Secure | produkce **ano** |

Env:

```bash
NODE_ENV=production
COOKIE_SECURE=true
# Pokud COOKIE_SECURE vynecháš při NODE_ENV=production → Secure default true
# COOKIE_SECURE=false v produkci = warning v logu (nedoporučeno)
```

Fastify: `trustProxy: true` (za Caddy čte `X-Forwarded-*`).  
Kód: [`server/src/env.ts`](../server/src/env.ts), [`server/src/auth/session.ts`](../server/src/auth/session.ts).

**Checklist:**

- [ ] V DevTools → Application → Cookie má `Secure`  
- [ ] Login přes HTTPS nastaví cookie; klient posílá `credentials: 'include'`

---

## 4. Produkční env (souhrn)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=...long...
ALLOWED_ORIGINS=https://your-domain.cz
COOKIE_SECURE=true
PORT=3001
```

Viz [`server/.env.example`](../server/.env.example).

---

## 5. Stav

| Položka | Stav |
|---------|------|
| CORS allowlist v kódu | Hotovo |
| Secure cookie + prod default | Hotovo |
| trustProxy | Hotovo |
| Caddy / TLS na Vedos | `[TODO: nasadit]` |
| `ALLOWED_ORIGINS` produkční | `[TODO: doména]` |
