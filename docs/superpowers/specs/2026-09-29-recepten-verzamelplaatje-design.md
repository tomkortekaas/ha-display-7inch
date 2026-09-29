# Receptenpagina: directe lijst met verzamelplaatje per pagina

**Datum:** 2026-09-29
**Status:** Ontwerp goedgekeurd in gesprek, spec ter review
**Raakt:** `ha_display_7inch` (ESPHome + HA-package) en `recipe-hub` (backend op `192.168.1.237:3002`)

## Aanleiding

De receptenlijst op het 7-inch display flitst (blauw/zwart) en de plaatjes druppelen binnen. Bovendien toont het display maximaal 24 recepten, terwijl "Eerder toegevoegd" er 103 en Favorieten er 98 bevat, en een recept dat Tom in de AH-app kiest verschijnt pas na de nachtelijke sync.

## Vastgestelde oorzaken (gemeten op 2026-09-29)

- Elke tabwissel laadt alle 24 losse thumbnails opnieuw (één set slots voor drie tabs), één per 250 ms: ~6 s.
- Het flitsen komt van het **aantal** image-loads, niet van de hardware-JPEG-decoder:

| Test op het paneel | Loads | Flits |
|---|---|---|
| 24 losse 96×72-thumbnails, alleen software-decode | 24 | ja |
| 1 verzamelplaatje 96×864, software-decode (~92 ms) | 4 waargenomen | 0 |
| 1 verzamelplaatje 96×864, hardware-decode (8 ms) | 3 | 1 |

- Uitsnede per kaart werkt: `lv_image` met `inner_align TOP_LEFT` en `offset_y = -72 * i` op een 96×72-widget toonde bij elke kaart het juiste gerecht.
- recipe-hub serveert lijsten uitsluitend uit zijn SQLite-cache; die wordt alleen om 03:30 bijgewerkt.

## Eisen

1. Kiezen gebeurt op het scherm; "Eerder toegevoegd" is de belangrijkste ingang (kiezen in de AH-app → recept op het scherm).
2. Plaatjes zijn essentieel.
3. Alle recepten van een lijst zijn doorbladerbaar.
4. Geen flits bij openen, bladeren of tabwissel.
5. Een recept dat in de AH-app is gekozen, staat na het openen van de pagina binnen enkele seconden bovenaan.

## Architectuur

```
AH ──(nacht-sync 03:30 + live bij openen, alleen cart)──► recipe-hub (SQLite + beeldcache)
                                                              │
                 ┌────────────────────────────────────────────┤
                 ▼                                            ▼
     GET /api/display/recipes                    GET /api/display/recipes/sheet
     (JSON, 10 per pagina)                       (1 JPEG 96×720 per pagina)
                 │                                            │
                 └────────────────► ESPHome ◄─────────────────┘
```

Home Assistant zit niet meer in de lijstroute. Het detail (`GET /api/ah/recipe/:id/text`) blijft ongewijzigd.

## Backend (recipe-hub)

### `GET /api/display/recipes?list=cart|favorites|custom&page=N`

```json
{
  "list": "cart",
  "page": 0,
  "pages": 11,
  "total": 103,
  "version": "k3x9a",
  "refreshing": false,
  "recipes": [
    { "id": "1200054", "title": "…", "duration": 25, "servings": 4 }
  ]
}
```

- Paginagrootte vast op 10; `page` is 0-gebaseerd. Een `page` buiten bereik wordt de laatste geldige pagina; een lege lijst geeft `pages: 1`, `total: 0`, `recipes: []`.
- `version`: korte hash over de id's en foto-URL's van precies deze pagina, in volgorde.
- `refreshing: true` alleen als dit verzoek (of een lopend verzoek) een live verversing van de lijst heeft gestart.
- Onbekende `list` → HTTP 400.
- Response blijft onder 4 KB (het display gebruikt al een buffer van 32 kB voor `/text`).

### `GET /api/display/recipes/sheet?list=…&page=N&v=VERSION`

- Baseline-JPEG van 96×720: 10 thumbnails van 96×72 onder elkaar, in dezelfde volgorde als de JSON-pagina.
- Plekken zonder recept en thumbnails die niet op te halen zijn: effen donker vlak (`#15151F`, de kaartkleur).
- Opgebouwd uit de bestaande thumbnail-cache (`thumbCacheFile`); het resultaat wordt op schijf bewaard met sleutel lijst + pagina + versie.
- Wijkt `v` af van de huidige versie, dan wordt toch het plaatje van de **huidige** inhoud geleverd; het display vraagt altijd met de versie uit de JSON die het net heeft ontvangen.
- Geen chroma-subsampling-eisen; afmetingen zijn veelvouden van 16 zodat hardware-decode mogelijk blijft, maar het display gebruikt software-decode.

### Live verversen

- Alleen voor `list=cart`, alleen bij `page=0`.
- Is de laatste live ophaalactie van die lijst meer dan 2 minuten geleden, dan start de backend er één op de achtergrond (single-flight: nooit twee tegelijk) en antwoordt direct uit de cache.
- Mislukt de live ophaalactie (AH onbereikbaar, token verlopen), dan blijft de cache staan en wordt de fout gelogd; het display merkt daar niets van.
- Favorieten blijven bij de nachtelijke sync; eigen recepten zijn lokaal en altijd actueel.

### Blijft ongewijzigd

- `/api/ah/recipes`, `/api/ah/favorites`, `/api/ah/recipe/:id/image`, `/api/ah/recipe/:id/text`: in gebruik door de webpagina van recipe-hub en het detailscherm.

## Display (ESPHome)

### Layout (1024×600)

```
┌──────────────────────────────────────────────────────────────┐
│ Recepten   103        [Eerder toegevoegd] [Favorieten] [Eigen]│  y 0–74 (ongewijzigd)
├──────────────────────────────┬───────────────────────────────┤
│ [foto] Titel                 │ [foto] Titel                  │
│        25 min · 4 p          │        30 min · 2 p           │  5 rijen × 2 kolommen, kaart 464×86
│   …                          │   …                           │
├──────────────────────────────┴───────────────────────────────┤
│   ‹ Vorige            Pagina 1 van 11            Volgende ›   │  y 554–600
└──────────────────────────────────────────────────────────────┘
```

- De pagina scrollt niet meer.
- Het getal naast "Recepten" toont `total` van de actieve lijst (nu hard "24 recepten").
- Vorige is uitgeschakeld (grijs) op pagina 1, Volgende op de laatste pagina.

### Bladeren

- Vorige/Volgende-knoppen onderaan.
- Horizontale swipe (≥ 90 px, horizontaal dominant) die begint tussen x = 120 en x = 904: links = volgende, rechts = vorige. Swipes vanaf de linker- en rechterrand houden hun huidige functie (navigatie, Spotify-drawer).

### Laadgedrag

1. Laadscript `recipe_list_load` (mode `restart`, zodat snel doorbladeren alleen de laatste pagina laadt) haalt de pagina-JSON op en zet direct titels, meta, teller en paginatekst. Fotovakken tonen een effen donker vlak tot het plaatje binnen is.
2. Daarna één `artwork_image` (`recipe_sheet`, 96×720, `hardware_acceleration: false`) met URL `…/sheet?list=…&page=…&v=…`. Na `on_download_finished` krijgen de 10 kaart-images die bron met `offset_y = -72 * i`.
3. Het plaatje respecteert de bestaande `artwork_busy`-vergrendeling.
4. Openen van de receptenpagina: altijd pagina 1 van de laatst gekozen tab.
5. Bevat het antwoord `refreshing: true`, dan vraagt het display na 5 s pagina 1 nogmaals op, maar alleen als de pagina dan nog zichtbaar is en nog op pagina 1 staat. Bij een andere `version` worden tekst en plaatje vervangen; anders gebeurt er niets.

### Tabs

- De actieve tab staat in een global met `restore_value: yes`; standaard "Eerder toegevoegd".
- Tik op een tab: tabknoppen herkleuren en pagina 1 van die lijst laden.

### Detail

- De recept-id's van de zichtbare pagina staan in een global (10 strings). Tik op kaart *i* opent het detail met die id via het bestaande `recipe_load_current`.
- Terug uit het detail toont dezelfde pagina zonder herladen.
- Een kaart zonder recept (laatste pagina) is niet aantikbaar.

### Fouten

- Pagina-JSON mislukt of HTTP ≠ 200: de laatste inhoud blijft staan en de kopregel toont "Recepten niet bereikbaar" in plaats van het aantal. Bij de volgende keer openen, bladeren of wisselen van tab wordt het opnieuw geprobeerd.
- Plaatje mislukt: donkere vlakken blijven staan, titels en aantikken werken gewoon. Geen automatische retry.

### Wat verdwijnt uit `ha-display-7.yaml`

- `recipe_thumb_1` … `recipe_thumb_24`, de globals `recipe_thumb_*` en `ah_recipes_dirty`, en de 250 ms-dispatcher en 1 s-teksttimer.
- De 96 `homeassistant`-sensoren `ha_recept_*`, `ha_recipe_tab` en de ongebruikte `ha_ah_favorites`.
- Kaarten 11–24 en de scrollcontainer van de lijst.

## Home Assistant (laatste, losse stap)

Pas nadat het display op de nieuwe route draait en bevestigd werkt:

1. In de live HA controleren of `sensor.ah_recept_*`, `sensor.ah_cart_raw`, `sensor.ah_favorites_raw`, `sensor.ah_custom_raw` en `input_select.ah_recipe_tab` nergens anders gebruikt worden (dashboards, automatiseringen, scripts).
2. Niets gevonden: de 3 REST-sensoren, 96 template-sensoren, het `input_select` en de webhook-automatisering `recipe_hub_custom_recipes_changed` verwijderen uit HA en uit `ha-display-7-package.yaml`, en `HOME_ASSISTANT_CUSTOM_RECIPES_WEBHOOK_URL` in recipe-hub leegmaken.
3. Wel iets gevonden: alleen de 96 template-sensoren en het `input_select` verwijderen; de REST-sensoren blijven.

## Testen

### Backend (vitest in recipe-hub)

- Paginering: paginagrootte 10, `pages`/`total` klopt, pagina buiten bereik, lege lijst.
- `version` verandert als een id of foto-URL op de pagina verandert, en blijft gelijk als alleen een andere pagina verandert.
- Verzamelplaatje: 96×720 baseline-JPEG; lege plekken en mislukte thumbnails worden donker opgevuld.
- Live verversen: alleen cart + page 0, niet vaker dan 1× per 2 minuten, single-flight, en een mislukte live-ophaalactie laat de cache intact.

### Display (op het paneel, met Tom als waarnemer)

- Geen flits bij openen, bij 5× bladeren en bij 3 tabwissels.
- Pagina staat er binnen ~0,5 s na openen of bladeren (gemeten in de logs).
- Recept toevoegen in de AH-app → pagina openen → recept staat binnen ~10 s bovenaan "Eerder toegevoegd".
- Detail openen vanaf pagina 3 of later toont het juiste recept; terug komt uit op dezelfde pagina.
- Backend stoppen → melding "Recepten niet bereikbaar"; backend starten → volgende keer openen werkt.

## Buiten scope

- Zoeken of filteren in lijsten.
- Live verversen van Favorieten.
- Wijzigingen aan het detailscherm.
- Opruimen van de verouderde `photo-swipe-patch`-map en `deploy-to-ha.sh` in deze repo (apart oppakken).
