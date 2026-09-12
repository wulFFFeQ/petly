# LOVED & KNOWN — Co umíme na startu / co ne

**Produkt:** LOVED & KNOWN  
**Účel:** Jedna stránka produktových hranic (ne technický audit).  
**V aplikaci:** Nápověda → `/help` (sekce nahoře)  
**Ops / právo:** [LAUNCH-04-OPS-LEGAL.md](./LAUNCH-04-OPS-LEGAL.md) · [docs/legal/](./legal/) · `/privacy` · `/terms`  
**Inzerce:** [LAUNCH-05-PRO-LISTING.md](./LAUNCH-05-PRO-LISTING.md) — měsíční Pro listing (lifetime později)  
**Zdroj:** [LAUNCH-READINESS-AUDIT.md](./LAUNCH-READINESS-AUDIT.md)

---

## Jednou větou

Aplikace pro **majitele mazlíčků** a **solo profesionály** (katalog, služby, rezervace).  
**Ne** instituční provoz klinik/útulků. **Ne** živé platby mezi lidmi.

---

## Pro koho na startu

- Majitel a domácnost (péče o mazlíčka, kalendář, zprávy)
- Solo profesionál (profil, služby, dostupnost, rezervace)
- Typ „klinika“ / „útulek“ v katalogu = **jen označení profilu**, ne plný provoz organizace

---

## Co umíme

- Mazlíčci, fotky, péče a kalendář
- Discover / veřejné prohlížení
- Spotřebitelské zdraví (očkování, léky, váha, dokumenty) — **DEMO**, ne oficiální zdravotní dokumentace
- Rezervace u profesionála (vytvořit → potvrdit/odmítnout → zrušit/přeplánovat → dokončit)
- Zprávy a sdílení zdravotního výřezu v chatu
- Lost & Found a nouzová karta (veřejné projekce)
- Katalog profesionálů včetně typů klinika / útulek
- Jediná inzerční cesta na start: **měsíční Pro listing** (živé stržení až se Stripe; viz LAUNCH-05)
- DEMO checkout rezervace (**neúčtuje**, nikdy neoznačí „zaplaceno“)
- DEMO přepínač členství (není reálná platba předplatného; ≠ Pro listing)

---

## Co záměrně neumíme

| Oblast | Na startu | Proč |
|--------|-----------|------|
| **Kliniky** | **Ne** | Žádný týmový provoz, recepce, check-in ani klinický EMR (podpis, uzavření návštěvy, multi-klinika). Rezervace ≠ klinická návštěva. |
| **Útulky** | **Ne** | Žádný provozní workflow (příjem, kapacita, custody, instituční aktér). |
| **Platby mezi lidmi (P2P)** | **Ne** | Žádné převody majitel↔majitel ani „pošli peníze člověku“. Jen DEMO platba rezervace majitel→pro (bez Stripe / bez živého stržení). |
| **Lifetime / jiné inzerční SKU** | **Ne** | Na startu jen měsíční Pro listing. Lifetime a boosty až později. |

---

## Později (po startu)

Živé Stripe Connect a membership billing, **lifetime Pro listing**, push / e-mail / SMS, instituční EMR a provoz klinik/útulků, hlubší komunita, moderace, live registry čipů.

---

## DEMO vs produkce

Dnešní build je **high-fidelity DEMO** (localStorage / IndexedDB). Reálná multi-user data až po autentizaci, API, databázi a serverové autoritě — viz readiness audit.
