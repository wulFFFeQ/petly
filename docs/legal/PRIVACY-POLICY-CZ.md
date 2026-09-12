# Zásady ochrany osobních údajů (šablona CZ)

> **NÁVRH pro právní review — není právní rada.**  
> Doplňte `[TODO: …]`. Ostrá verze až po schválení counsel.  
> Brief: [LAWYER-BRIEF-CZ.md](./LAWYER-BRIEF-CZ.md) · App draft: `/privacy`

**Účinnost (návrh):** `[TODO: datum]`  
**Správce:** `[TODO: právní název]`, IČO `[TODO]`, sídlo `[TODO: adresa]`, země `[TODO: CZ]`  
**Kontakt GDPR / žádosti subjektů:** `[TODO: e-mail]`  
**DPO (pokud jmenován):** `[TODO: jméno / e-mail / „nejmenován“]`

---

## 1. Úvod

Tyto zásady popisují, jak `[TODO: právní název]` („my“, „provozovatel“) zpracovává osobní údaje v souvislosti se službou **LOVED & KNOWN** (webová aplikace).

## 2. Správce

Správcem osobních údajů je:

- **Název:** `[TODO: právní název]`
- **IČO:** `[TODO]`
- **DIČ:** `[TODO: nebo „neplátce“]`
- **Adresa:** `[TODO]`
- **E-mail:** `[TODO]`

## 3. Účely a právní základy

| Účel | Příklady údajů | Právní základ (návrh k review) |
|------|----------------|-------------------------------|
| Zřízení a správa účtu | jméno, e-mail, přihlášení | `[TODO: např. plnění smlouvy / oprávněný zájem]` |
| Profily mazlíčků a péče | jméno zvířete, péče, kalendář | `[TODO]` |
| Spotřebitelské zdraví a dokumenty | očkování, léky, soubory | `[TODO: pozor — citlivost / zvláštní kategorie?]` |
| Rezervace u profesionálů | termín, kontakt, stav rezervace | `[TODO]` |
| Zprávy a sdílení výřezů | obsah konverzace, sdílené záznamy | `[TODO]` |
| Lost & Found / nouzová karta | veřejná projekce dle nastavení | `[TODO: souhlas / oprávněný zájem]` |
| Pro listing (měsíční inzerce) | údaje profilu profesionála, fakturace | `[TODO]` |
| Platby (až po zapnutí Stripe) | platební metadata; kartové údaje u Stripe | `[TODO]` |
| Provoz, bezpečnost, podpora | logy, IP, session | `[TODO]` |
| Právní povinnosti | účetní / daňové | právní povinnost |

## 4. Kategorie osobních údajů

1. **Účet** — identifikace, kontakt, role (majitel / profesionál).  
2. **Mazlíček** — identity, fotky, péče, kalendář.  
3. **Spotřebitelské zdraví a dokumenty** — záznamy a soubory, které uživatel vloží (nejde o oficiální zdravotnickou dokumentaci kliniky).  
4. **Komunikace** — zprávy, notifikace v aplikaci.  
5. **Veřejné projekce** — Discover, L&F, nouzová karta dle nastavení soukromí.  
6. **Technická data** — session, zařízení, přibližné logy.  
7. **Profesionální profil** — katalog, služby, dostupnost; typ „klinika“/„útulek“ je jen označení.

## 5. DEMO vs produkční uložení

- **DEMO (současný stav):** údaje mohou být uloženy lokálně v prohlížeči (localStorage / IndexedDB). Nejde o produkční multi-user autoritu.  
- **Produkce (plán):** server (Fastify), PostgreSQL, privátní object storage; session přes HTTP-only cookies. Hosting: Railway.  
Podrobnosti: `docs/NODE-PRISMA-BACKEND.md`, `docs/LAUNCH-04-OPS-LEGAL.md`.

## 6. Příjemci a zpracovatelé

- Hosting a infrastruktura: **Railway** (a případní sub-processoři).  
- Úložiště dokumentů: S3-compatible poskytovatel `[TODO: název]`.  
- Platby (po zapnutí): **Stripe** — platební údaje dle podmínek Stripe.  
- Profesionálové a členové domácnosti: jen v rozsahu **explicitních grantů** uživatele.  
- Právní / účetní poradci, orgány veřejné moci — pokud zákon vyžaduje.

**Neposkytujeme** plný instituční přístup klinikám/útulkům jako EMR. **Neprovozujeme** P2P převody mezi uživateli.

## 7. Předání mimo EHP

`[TODO: ano/ne — pokud ano, mechanismus (SCC / adekvátnost) a příjemci]`

## 8. Doba uložení

`[TODO: retence per kategorie — účet aktivní + X; rezervace Y; účetní doklady Z; po výmazu účtu…]`  
DEMO data závisí na prohlížeči uživatele do migrace na server.

## 9. Cookies a podobné technologie

- Po nasazení produkčního backendu: **nezbytné** cookies pro přihlášení (session).  
- Marketingové / analytické cookies a samostatný cookie banner: **mimo tuto šablonu** (doplnit později, pokud budou nasazeny).

## 10. Práva subjektů údajů

Podle GDPR mimo jiné: přístup, oprava, výmaz, omezení, námitka, přenositelnost, odvolání souhlasu (kde souhlas je základem).  
Žádosti: `[TODO: e-mail]`.  
Technické export/erase enginy budou doplněny před ostrým multi-user provozem.  
Stížnost: Úřad pro ochranu osobních údajů (ÚOOÚ), [https://www.uoou.cz](https://www.uoou.cz).

## 11. Děti

Služba není určena dětem mladším `[TODO: např. 16 / 15]` let bez souhlasu zákonného zástupce dle platné úpravy. `[TODO: věková hranice counsel]`

## 12. Zabezpečení

Přiměřená technická a organizační opatření; produkce: autentizace, serverová autorizace, privátní úložiště dokumentů. DEMO režim nemá produkční záruky persistence ani multi-user izolace.

## 13. Změny zásad

Změny zveřejníme v aplikaci (např. `/privacy`) a `[TODO: e-mail / datum účinnosti]`. Podstatné změny oznámíme vhodným způsobem před účinností.

## 14. Kontakt

`[TODO: právní název]` · `[TODO: e-mail]` · `[TODO: adresa]`
