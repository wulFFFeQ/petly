# LOVED & KNOWN — Inzerce: měsíční Pro listing

**Produkt:** LOVED & KNOWN  
**Účel:** Produktové rozhodnutí — jedna inzerční cesta na start.  
**Související:** [LAUNCH-01-SCOPE.md](./LAUNCH-01-SCOPE.md) · [LAUNCH-04-OPS-LEGAL.md](./LAUNCH-04-OPS-LEGAL.md)

---

## Jednou větou

**Na startu je jediná placená inzerce: měsíční Pro listing.**  
Lifetime (jednorázový) Pro listing = **až později**.

---

## Co je Pro listing

- Placená přítomnost / zvýrazněná viditelnost **solo profesionála** v katalogu (`/professionals`).
- Patří k inzerci profilu služeb — ne k EMR klinik, ne k provozu útulků, ne k P2P platbám.
- Live stržení peněz až se Stripe (viz LAUNCH-04); do té doby jen produktová hranice + DEMO UI.

---

## Co Pro listing není

| Produkt | Na startu |
|---------|-----------|
| Lifetime Pro listing | **Ne** (později) |
| Boost balíčky / další inzerční SKU | **Ne** |
| Consumer membership (Premium / Family / Breeder Pro) | Oddělené — DEMO; ≠ Pro listing |
| Platba rezervace majitel→pro | Oddělené (booking checkout DEMO) |
| Clinic / shelter SaaS inzerce | **Ne** |

---

## Měsíční vs lifetime

| Varianta | Start | Poznámka |
|----------|-------|----------|
| **Měsíční Pro listing** | **Ano** (rozhodnutá cesta) | Jediný inzerční produkt k wireování po Stripe |
| **Lifetime Pro listing** | Později | Jednorázový nákup; nepřidávat SKU ani copy jako „dostupné teď“ |

---

## Vztah k ostatním platbám

1. **Pro listing** — inzerce v katalogu (měsíční).  
2. **Booking payment** — DEMO checkout rezervace (ne P2P).  
3. **Consumer membership** — DEMO přepínač tarifů; není náhradou Pro listingu.

Žádné míchání těchto tří do jednoho checkoutu.
