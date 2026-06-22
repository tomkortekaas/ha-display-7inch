# AH Recepten Scherm — Design Spec

**Datum:** 2026-06-22  
**Status:** Goedgekeurd

## Samenvatting

Een nieuw scherm op de 7" ESPHome display (Guition JC1060P470, 1024×600) waarmee de gebruiker AH-favorietenrecepten kan bekijken tijdens het koken. De favorietenlijst wordt native in LVGL getoond; het recept-detail (ingrediënten + bereidingsstappen) wordt als PNG gerenderd door de bestaande Next.js app en geladen via `online_image`.

## Architectuur (Aanpak C)

```
AH API (ah.nl)
    ↓ inloggen met AH_USERNAME + AH_PASSWORD (env vars)
Next.js API routes (192.168.1.237:3001)
    ├── GET /api/ah/favorites              → JSON lijst favorieten (gecacht 6u)
    ├── GET /api/ah/recipe/[id]/image?step=0  → 1024×600 PNG (ingrediënten + stap 1)
    └── GET /api/ah/recipe/[id]/image?step=N  → 1024×600 PNG (ingrediënten + stap N)
    ↓
HA REST sensor: sensor.ah_favorites (pollt elke 6 uur)
    ↓
ESPHome LVGL pagina 8:
    ├── Favorietenlijst (native LVGL knoppen, data uit HA sensor)
    └── Detail-view (online_image laadt PNG, vorige/volgende knoppen)
```

## Scherm 1 — Favorietenlijst (LVGL)

- Bereikbaar via nav rail icoon 🍳 (pagina 8)
- Native LVGL lijst met scrollbare knoppen
- Per item: receptnaam + bereidingstijd + aantal personen
- Aantikken → laadt recept-detail PNG (`step=0`) en schakelt naar detail-view
- Data komt uit `sensor.ah_favorites` (JSON attribuut `favorites`)

## Scherm 2 — Recept Detail (PNG via online_image)

- Volledige 1024×600 PNG gerenderd door Next.js (zelfde resolutie als display)
- **Links (1/3):** ingrediëntenlijst met hoeveelheden
- **Rechts (2/3):** huidige bereidingsstap (actief gemarkeerd), stapnummer
- **Onderin:** vorige / volgende knoppen (LVGL overlay op de PNG), paginadots
- **Terug-knop:** rechtsonder, keert terug naar favorietenlijst

### Navigatie bereidingsstappen
- `step=0` = ingrediënten-overzicht + stap 1 gemarkeerd
- `step=N` = zelfde ingrediëntenkolom + stap N gemarkeerd
- Vorige/volgende knoppen in ESPHome verhogen/verlagen een `globals.ah_current_step` variabele en triggeren `component.update` op de `online_image`

## Next.js Implementatie

### Nieuwe bestanden
- `src/app/api/ah/favorites/route.ts` — AH login + favorites ophalen, 6u cache
- `src/app/api/ah/recipe/[id]/image/route.ts` — recept detail PNG renderer

### AH API aanpak
De AH app gebruikt een OAuth2-gebaseerde API op `api.ah.nl`. Inloggen via username/password, toegangstoken cachen in memory (verloopt na ~1u, automatisch vernieuwen).

Referentie: [agentcooper/albert-heijn](https://github.com/agentcooper/albert-heijn) voor API-endpoints.

### PNG rendering
Next.js rendert de split-layout als HTML via een headless aanpak (bijv. `@vercel/og` / `satori`) of via een server-side canvas. Output: JPEG 1024×600, donker neon-thema passend bij de andere schermen.

### Environment variables
```
AH_USERNAME=jouw@email.nl
AH_PASSWORD=jouwwachtwoord
```

## HA Configuratie

```yaml
# REST sensor in configuration.yaml of package
sensor:
  - platform: rest
    name: ah_favorites
    resource: http://192.168.1.237:3001/api/ah/favorites
    scan_interval: 21600  # 6 uur
    value_template: "{{ value_json.favorites | length }} recepten"
    json_attributes:
      - favorites
```

## ESPHome LVGL

- Nieuwe pagina (`page8`) toegevoegd aan `ha-display-7.yaml`
- Nav rail krijgt 🍳 icoon als 8e item
- Globals: `ah_current_recipe_id` (string), `ah_current_step` (int), `ah_total_steps` (int)
- `online_image` component: URL opgebouwd uit globals via lambda
- Vorige/volgende knoppen: `lambda` verhoogt/verlaagt `ah_current_step`, daarna `component.update`

## Niet in scope

- Zoekfunctie binnen recepten
- Eigen recepten toevoegen (alleen AH-favorieten)
- Offline caching op het display zelf
- Maataanpassing (aantal personen aanpassen)
