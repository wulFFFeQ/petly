# Brief pro právníka — LOVED & KNOWN (CZ)

> **NÁVRH pro právní review — není právní rada.**  
> Účel: předat counsel kontext produktu před finalizací Privacy Policy a Obchodních podmínek.

**Šablony:** [PRIVACY-POLICY-CZ.md](./PRIVACY-POLICY-CZ.md) · [TERMS-OF-SERVICE-CZ.md](./TERMS-OF-SERVICE-CZ.md)  
**Ops checklist:** [../LAUNCH-04-OPS-LEGAL.md](../LAUNCH-04-OPS-LEGAL.md)  
**Produktové hranice:** [../LAUNCH-01-SCOPE.md](../LAUNCH-01-SCOPE.md) · [../LAUNCH-05-PRO-LISTING.md](../LAUNCH-05-PRO-LISTING.md)

---

## 1. Co produkt je

- Spotřebitelská aplikace **LOVED & KNOWN** pro majitele mazlíčků a **solo profesionály**.
- Funkce: profily mazlíčků, péče/kalendář, spotřebitelské zdraví a dokumenty, discover, zprávy, Lost & Found / nouzová karta, katalog profesionálů, rezervace.
- Značka / obchodní jméno: LOVED & KNOWN. Právní subjekt: `[TODO: právní název, IČO, sídlo]`.

## 2. Co produkt záměrně není (start)

| Oblast | Stav |
|--------|------|
| Kliniky (týmový provoz, EMR, check-in) | Ne |
| Útulky (příjem, custody, kapacita) | Ne |
| Platby mezi lidmi (P2P) | Ne |
| Oficiální zdravotnická dokumentace / veterinární rada | Ne — jen spotřebitelské záznamy majitele |
| Lifetime Pro listing / boost SKU | Ne (později) |

Typ „klinika“ / „útulek“ v katalogu = **označení profilu**, ne instituční software.

## 3. Inzerce a peníze

| Tok | Start |
|-----|--------|
| **Měsíční Pro listing** | Jediná plánovaná placená inzerce v katalogu |
| Booking payment majitel→pro | DEMO checkout (neúčtuje); live až Stripe |
| Consumer membership (Premium…) | DEMO; oddělené od Pro listingu |
| Stripe Connect / výplaty | Post-launch |
| P2P | Nikdy v scope startu |

## 4. Technický stav (relevantní pro Privacy)

- Dnes: **high-fidelity DEMO** — většina dat v prohlížeči (localStorage / IndexedDB).
- Cíl produkce: Node (Fastify) + PostgreSQL + session cookies; hosting **Vedos VPS** (Railway ne); dokumenty v private S3-compatible storage nebo disk na VPS.  
- Zálohy: Vedos interní denní / externí týdenní (doplňková služba) + aplikace `pg_dump`.
- Auth, serverová autorita a GDPR export/erase enginy = před ostrým multi-user provozem.
- Cookie banner / marketing cookies = **mimo** aktuální šablonu (jen zmínka nezbytných session cookies).

## 5. Co counsel doplní / schválí

1. Firemní identifikace ve všech `[TODO]`.
2. Právní základy GDPR (čl. 6) u jednotlivých účelů.
3. Retence, mezinárodní předání (pokud Stripe/US sub-processoři; Vedos = CZ/EU), DPO ano/ne.
4. Finální znění Privacy + Terms; až pak odstranit badge NÁVRH v app (`/privacy`, `/terms`).
