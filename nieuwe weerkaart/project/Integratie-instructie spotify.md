# Instructie voor Claude — voeg het SPOTIFY-SCHERM toe aan de bestaande config

Je krijgt een bestaande ESPHome-config voor een 4″ 480×480 touchpaneel met meerdere
LVGL-pagina's (afzuigkap, fotolijst, weer). Voeg daar een **extra pagina** aan toe: het
Spotify-scherm (Variant C — *Ambient*, album-art full-bleed). De volledige UI + logica staat
kant-en-klaar in **`spotify.yaml`**. Jouw taak is dat netjes te mergen — niet opnieuw ontwerpen.

> Stijl ligt vast (zwart 0x08080A, Montserrat, groen accent, MDI-iconen). Niet afwijken.
> Alles wat je moet invullen staat in `spotify.yaml` gemarkeerd met `>>> TODO`.

---

## Volgorde van werken

### 1. `font:` — voeg de media-fonts toe
Plak de `font:`-entries uit `spotify.yaml` onder je bestaande `font:` blok.
- Nieuw: `font_sp_title`, `font_sp_artist`, `font_sp_time`, en de MDI-fonts `font_sp_ctl`
  (transport) en `font_sp_mini` (hartje/volume/apparaat).
- **Niet** dupliceren: `font_brand`, `font_status` bestaan al — die hergebruikt dit scherm.
- ⚠️ Controleer de MDI-glyph-escapes (`\U000Fxxxx`) tegen jouw ESPHome-versie.

### 2. `online_image:` — album-art
Plak het `online_image:`-blok (`album_art`). Dit downloadt de hoes van de `media_player` over HTTP.
- **`>>> TODO`** zet een geldige placeholder-URL (bv. een vaste afbeelding op je HA onder `/local/`).
- **`format:`** Spotify levert de hoes meestal als **JPEG** — zet dan `format: JPEG` i.p.v. `PNG`.
- De echte hoes wordt at-runtime gezet via `album_art.set_url(...)` in de `sp_picture`-sensor.

### 3. `sensor:` / `text_sensor:` — koppel Home Assistant
Plak de `homeassistant`-sensoren en **vervang overal `media_player.spotify`** door jouw entity.
Je hebt nodig: `media_position`, `media_duration`, `volume_level` (sensoren) en `state`,
`media_title`, `media_artist`, `media_album_name`, `source`, `shuffle`, `repeat`, `entity_picture`
(text_sensoren). In de `entity_picture`-sensor staat **`>>> TODO` je HA-basis-URL**
(bv. `http://homeassistant.local:8123`).

### 4. `lvgl: -> pages:` — voeg de pagina toe
Plak de hele `spotify_page` onder `lvgl: pages:`. **Zet 'm in de gewenste swipe-volgorde** t.o.v.
je andere pagina's (de volgorde van `pages:` bepaalt links/rechts vegen). De pagina bevat al:
full-bleed album-art, donkere scrim, twee topbar-pillen, titel/artiest + like, voortgangsbalk
(sleepbaar → `media_seek`), transport (shuffle/vorige/play-pause/volgende/repeat) en een
volumeschuif. Alle knoppen roepen rechtstreeks `media_player.*`-acties aan in Home Assistant.

### 5. `script:` — voeg het refresh-script toe
Plak `refresh_spotify` onder je bestaande `script:` blok.
- Wordt al aangeroepen vanuit de `on_value:` van de sensoren.
- Roep `refresh_spotify` ook eenmalig aan in `esphome: -> on_boot:` (naast je bestaande
  `refresh_ui`), zodat het scherm bij opstart klopt.

### 6. Navigatie — pagina-indicator + tikzones
In `spotify_page` staan al twee onzichtbare tikzones links/rechts (smal, 40px, zodat ze de
transport-knoppen niet blokkeren). Doe verder hetzelfde als bij het weerscherm:
- Plak het **indicator-stippen-blok** ook op deze pagina en verschuif de brede "on"-stip naar de
  juiste positie in je `pages:`-volgorde.
- Optioneel: laat `sp_state` automatisch naar dit scherm springen zodra er muziek speelt
  (zie de TIP onderaan `spotify.yaml`).

---

## Wat NIET vanzelf werkt (let op)

- **Like/unlike** (`media_player` heeft hier geen standaard-actie voor). De hartknop roept
  `script.spotify_toggle_like` aan — maak dat zelf in HA (bv. via Spotcast / de Spotify-API),
  of haal de knop weg. Het hartje toont nu vast de "geliked"-kleur.
- **Album-art-accentkleur**: op het apparaat extraheren we geen kleur uit de hoes; het accent
  blijft groen. De scrim onderin houdt tekst leesbaar bij elke hoes.
- **Scrim-fade**: LVGL kan niet binnen één object naar transparant faden. We gebruiken een
  donkere balk met verticale gradient. Wil je 'm zachter: verlaag `bg_opa` of stapel twee objecten.

## Eindcheck
- [ ] Alle `media_player.spotify` vervangen door jouw entity.
- [ ] HA-basis-URL ingevuld (sp_picture-lambda én online_image-placeholder).
- [ ] `online_image: format` klopt (meestal JPEG).
- [ ] MDI-glyph-escapes kloppen voor jouw ESPHome-versie.
- [ ] `refresh_spotify` in `on_boot` + via de sensor-`on_value`'s.
- [ ] `spotify_page` in de juiste swipe-volgorde; indicator-stip verschoven.
- [ ] Like-knop gekoppeld of verwijderd.
- [ ] Niets valt onder de 480px-rand; tekst ≥12px.

Bij twijfel over een widget-property: houd 'm aan tegen de actuele ESPHome-LVGL-docs; de structuur
en posities in `spotify.yaml` zijn leidend.
