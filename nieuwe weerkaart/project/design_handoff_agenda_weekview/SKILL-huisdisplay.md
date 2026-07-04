# SKILL — "Huisdisplay" ontwerpsysteem voor 4″ 480×480 touchscreens (ESPHome + LVGL)

Je bouwt schermen voor kleine, ronde-hoek **4-inch 480×480 touchpanelen** (ESP32-S3 + RGB-paneel) die in
huis hangen: afzuigkap-bediening, Immich-fotolijst, weerstation, enzovoort. Alle schermen delen één
strakke, donkere "control-room"-stijl. Dit document is de **single source of truth** voor die stijl.

> Doel: gegeven een nieuwe opdracht ("maak een scherm voor X"), produceer je een ESPHome/LVGL-YAML én
> (optioneel) een HTML-mockup die **naadloos** naast de bestaande schermen past. Wijk niet af van de
> tokens en patronen hieronder tenzij de gebruiker er expliciet om vraagt.

---

## 0. Werkwijze (volg deze volgorde)

1. **Begrijp de functie.** Wat moet het scherm tonen/bedienen? Welke Home Assistant-entiteiten zijn de bron?
2. **Kies een archetype** (zie §5): *bediening* (segmenten/sliders), *dashboard* (kaarten + data), of *ambient* (full-bleed beeld).
3. **Mock eerst in HTML** op een echt 480×480 canvas (zie §6) als de gebruiker visuele afstemming wil. Schaal het canvas in de viewport, ontwerp op ware grootte.
4. **Vertaal naar LVGL-YAML** met de conventies uit §7. Lever het als **los te mergen blok** met `>>> TODO`-markers.
5. **Voeg altijd de navigatie toe** (§4.6) zodat het scherm in de bestaande multi-page config past.
6. **Lever een checklist** (§8) mee zodat de integrator weet wat hij moet invullen.

---

## 1. Designtaal in één alinea

Bijna-zwarte achtergrond, **Montserrat** (zwaar voor cijfers, medium voor labels), genereuze ronde
hoeken (radius 18–28), rustige donkere "surface"-vlakken, en **één functionele accentkleur per context**
(koel = ventilatie/koud, warm = licht/zon). Veel negatieve ruimte, grote tikbare zones (≥44px),
tabulaire cijfers, ALL-CAPS micro-labels met letter-spacing. Geen gradients als versiering, geen emoji,
geen drop-shadows behalve een subtiele glow achter een hero-icoon. Material Design Icons voor pictogrammen.

---

## 2. Kleur-tokens (canoniek — kopieer exact)

| Rol | Hex (LVGL) | CSS | Gebruik |
|---|---|---|---|
| Achtergrond | `0x08080A` | `#08080a` | paginabasis (bijna zwart) |
| Surface | `0x131418` | `#131418` | kaarten, tubes, panelen |
| Surface-2 | `0x1B1C21` | `#1b1c21` | leeg segment, balk-baan, actieve rij |
| Lijn | — | `rgba(255,255,255,.07)` | randen op surfaces |
| Lijn-2 | `0x2A2B30` | `rgba(255,255,255,.16)` | sterkere randen / arc-baan |
| Tekst | `0xFFFFFF` | `#ffffff` | primaire tekst |
| Tekst muted | `0x6B6E76` | `oklch(0.58 0.012 250)` | secundair, labels |

**Accenten per context** (kies er meestal één per scherm; bij data mag het per-item variëren):

| Accent | Hex | Betekenis |
|---|---|---|
| Koel cyaan | `0x38BDF8` | ventilatie, koeling, "aan" |
| Warm amber | `0xF5B45A` | verlichting, zon, warmte |
| Regenblauw | `0x5A96EB` | regen / neerslag |
| Koel blauw | `0x78B4EB` | licht bewolkt / neutraal-actief |
| Grijsblauw | `0x96AAC3` | bewolkt / inactief-met-nadruk |
| Paars | `0x9678EB` | onweer / waarschuwing |
| Groen | `0x4ADE80` | status-ok, "live"-dot |

**Conditie-afhankelijke accenten** (weer e.d.): map de toestand → accent met een kleine lambda/lookup,
i.p.v. één vaste kleur. Temperatuur → kleur: lineair van koud blauw (`0x3A78D2`) naar warm oranje
(`0xF59E42`) over het bereik −5…35 °C.

CSS-equivalent voor mockups (`:root`): gebruik `oklch()` voor afgeleide tinten zodat ze harmonisch blijven;
verzin geen losse hex-kleuren buiten deze set.

---

## 3. Typografie

**Familie:** Montserrat (overal). Laad via `gfonts://Montserrat@<weight>`. In CSS via Google Fonts.

| Token | Weight | px (480-canvas) | Gebruik |
|---|---|---|---|
| Hero-cijfer | 800 | 56–104 | grote temperatuur / standwaarde |
| Titel | 700 | 18–22 | conditie, schermtitel |
| Brand | 700 | 14–16 | ALL-CAPS topbar-merk, `letter-spacing: 3px` |
| Label | 600 | 13–15 | rij-labels, kaart-bijschrift |
| Status / micro | 500–600 | 11–13 | klok, eenheden, ALL-CAPS micro-label `letter-spacing: 1.5–2.5px`, kleur muted |

Regels:
- Cijfers altijd `font-variant-numeric: tabular-nums` (CSS) zodat ze niet "springen".
- Graden-teken lichter dan het getal (aparte `<span>`, weight 600).
- Negatieve `letter-spacing` (−3 tot −5px) op de hele grote hero-cijfers.
- Micro-labels ALL-CAPS met ruime letter-spacing; nooit groter dan 13px.
- **Minimale leesbare tekst op dit scherm: ~12px.** Ga daar niet onder.

---

## 4. Component-patronen

### 4.1 Topbar (op elk niet-ambient scherm)
Rij bovenin: **merk/plaats links** (ALL-CAPS, brand-font), **status rechts** (muted, met een groene
"live"-dot van 7px + glow), en — als het scherm deel uitmaakt van de multi-page set — de
**pagina-indicator absoluut gecentreerd** (zie §4.6). Padding rondom de pagina: 24–30px.

### 4.2 Surface / kaart
`background: surface`, `border: 1px lijn`, `radius: 18–28`, interne padding 11–16px. Kaart-kop =
ALL-CAPS micro-label (muted) + één regel vette witte samenvatting. Gebruik kaarten om data te groeperen
(buienradar, zon, sensorwaarde).

### 4.3 Chip / stat-tegel
Kleine afgeronde tegel (`radius 18–20`) in een grid met `gap`, inhoud verticaal gecentreerd: icoon →
groot getal (800) → ALL-CAPS eenheid (muted). Gebruik voor wind/vocht/neerslag/UV e.d. Layout altijd met
CSS grid/flex + `gap`, nooit losse inline-elementen.

### 4.4 Segment-balk (bediening)
Stand 0–N als een verticale of horizontale **tube** (`surface`) met gevulde segmenten in de accentkleur en
lege segmenten in `surface-2`. Hele segmenten zijn tikbaar (hele tube als hit-target, ≥44px). De stand
wordt in een `global` bewaard en door een `refresh_*`-script teruggeschreven naar de UI.

### 4.5 Verloop-/range-balk (data)
Voor min–max ranges (bv. dag lo→hi): een `bar` in **RANGE-modus**; `start_value`/`value` geschaald op het
globale min/max van de dataset. Indicatorkleur = waarde-afhankelijk (bv. temperatuur→kleur). Optioneel een
gloeiende "nu"-stip (witte cirkel met glow) op de huidige positie.

### 4.6 Pagina-indicator + navigatie (multi-page)
- **Indicator:** rij van stipjes, `TOP_MID` gecentreerd. Inactief = 6px rond, `bg_opa 22%`; actief = 16px
  brede afgeronde pil, vol wit. Eén indicator-blok per pagina; verschuif de brede stip naar de actieve.
- **Tikzones:** twee onzichtbare `button`s (transparant) van ~56px breed langs de linker- en rechterrand,
  volle hoogte → `lvgl.page.previous` / `lvgl.page.next` met `OVER_RIGHT` / `OVER_LEFT`, 250ms.
- Volgorde van `pages:` = swipe-volgorde. Houd 'm consistent over alle schermen.

### 4.7 Hero-icoon met glow
Groot MDI-glyph (of weericoon) met een zachte radiale glow erachter (in CSS: `::before` met
`radial-gradient` + `blur`; in LVGL: een halftransparante gekleurde cirkel onder het icoon). Alleen voor
het hoofd-onderwerp van het scherm — niet als decoratie strooien.

---

## 5. Archetypes (kies er één als vertrekpunt)

1. **Bediening** (afzuigkap): grote standwaarde + segment-balk(en), één accent per functie, hele segmenten
   tikbaar, stand in `globals` + `apply_*`/`refresh_*`-scripts. Minimalistisch, één taak per scherm.
2. **Dashboard** (weer): topbar → hero (icoon + groot getal + meta-regel met wind/UV) → 1–2 kaarten
   (grafiek/arc) → lijst met range-balken. Data uit HA-sensoren, `refresh_*`-script vult alles.
3. **Ambient** (fotolijst): full-bleed beeld, minimale overlay (klok + bijschrift), geen topbar-chrome.
   HA levert beeld-URL + bijschriften; ESP toont alleen.

---

## 6. HTML-mockup conventie (voor visuele afstemming)

- Canvas exact **480×480**, `box-sizing: border-box`, padding 24–30px, `overflow: hidden`. Niets mag onder
  de 480px-rand vallen — controleer dat `scrollHeight === 480`.
- Schaal het canvas in de viewport met een `transform: scale()` op een wrapper (letterbox op zwart),
  zodat het als een echt paneel oogt. Ontwerp op ware grootte; verklein niet de inhoud om iets te laten passen.
- Zelfde tokens als §2/§3. Montserrat via Google Fonts. `tabular-nums` op cijfers.
- Bij meerdere ontwerp-varianten: zet ze naast elkaar op een design-canvas i.p.v. losse bestanden, zodat
  de gebruiker kan vergelijken. Lever uiteindelijk één "Definitief"-bestand met alleen de gekozen variant.
- Pictogrammen in de mockup mogen simpele inline-SVG line-glyphs zijn die 1-op-1 naar een MDI-icoon mappen.
  Teken geen complexe illustraties met SVG; gebruik placeholders/echte assets.

---

## 7. ESPHome / LVGL YAML-conventies

**Lever altijd als los te mergen blok**, gegroepeerd per top-level sleutel (`font:`, `globals:`,
`sensor:`/`text_sensor:`, `lvgl: pages:`, `script:`, `time:`), met een grote comment-kop die uitlegt wat
erin zit en wat de integrator invult. Markeer elk in-te-vullen punt met `>>> TODO`.

**Boilerplate (verwijs ernaar, dupliceer niet):** `esphome:` / `esp32: (board esp32-s3-devkitc-1)` /
`psram: octal 80MHz` / `logger api ota wifi` staan al in de bestaande config. Een nieuw scherm voegt
alleen z'n eigen `font`/`globals`/`sensor`/pagina/`script` toe.

**Fonts:** definieer per gebruikt formaat een aparte `font`-id (size vast). MDI-glyphs via de
MaterialDesign-Webfont TTF, met een expliciete `glyphs:`-lijst (alleen wat je gebruikt). Let op: in
sommige ESPHome-versies werken `\U000Fxxxx`-escapes niet — gebruik dan het echte glyph-teken of `0xFxxxx`.

**State:** bewaar standen/cijfers in `globals:` (met `restore_value` waar zinnig). Eén
`refresh_<scherm>`-script dat HA-sensoren leest en de LVGL-widgets bijwerkt; roep het aan vanuit
`on_value` van de sensoren en `on_boot`. Voor bediening: aparte `apply_*`-scripts die de fysieke uitgangen
aansturen.

**Data uit Home Assistant:** `homeassistant`-platform sensoren/text_sensoren. Voor afgeleide of
samengestelde data (bv. dag-forecast) lever je een **HA-template-voorbeeld** mee (`weather.get_forecasts`
e.d.) zodat de integrator de juiste sensoren in HA kan aanmaken.

**Kleur in lambda's:** `lv_color_hex(0x......)` of `lv_color_make(r,g,b)`. Helper-lambda's voor
state→icoon en state/waarde→kleur houden de UI-logica leesbaar.

**Naamgeving:** pagina `<\onderwerp>_page`; widget-id's kort en met prefix per rij/onderdeel
(`wx_temp`, `r0_bar`, `card_sun`). Comment-koppen in het Nederlands, in dezelfde toon als de bestaande files.

---

## 8. Opleverchecklist (zet onderaan elke YAML)

- [ ] `>>> TODO`: alle HA `entity_id`'s (en attributen) vervangen door die van de gebruiker.
- [ ] `>>> TODO`: eventueel benodigde HA-template-sensoren aangemaakt (forecast e.d.).
- [ ] Fonts: MDI-glyph-escapes gecontroleerd tegen de gebruikte ESPHome-versie.
- [ ] Pagina toegevoegd onder `lvgl: pages:` in de juiste swipe-volgorde.
- [ ] Pagina-indicator + tikzones op alle pagina's; brede "on"-stip per scherm verschoven.
- [ ] `refresh_<scherm>` aangeroepen vanuit `on_boot` en relevante `on_value`.
- [ ] Tikdoelen ≥44px; tekst ≥12px; niets onder de 480px-rand.
- [ ] Alleen tokens uit §2/§3 gebruikt; geen losse kleuren of emoji.

---

## 9. Mini-voorbeeld (skelet, ter referentie)

```yaml
# --- voeg toe aan font: ---
font:
  - { file: "gfonts://Montserrat@800", id: font_num, size: 56 }
  - { file: "gfonts://Montserrat@700", id: font_brand, size: 16 }

# --- voeg toe aan globals: ---
globals:
  - { id: my_level, type: int, restore_value: yes, initial_value: "1" }

# --- voeg toe aan lvgl: -> pages: ---
lvgl:
  pages:
    - id: voorbeeld_page
      bg_color: 0x08080A
      widgets:
        - label: { text: "TITEL", text_font: font_brand, text_color: 0xFFFFFF, text_opa: 85%, align: TOP_LEFT, x: 30, y: 26 }
        # ... pagina-indicator (TOP_MID) + tikzones (zie §4.6) ...
        - label: { id: big_val, text: "1", text_font: font_num, text_color: 0x38BDF8, align: CENTER }

# --- voeg toe aan script: ---
script:
  - id: refresh_voorbeeld
    then:
      - lambda: |-
          char buf[16]; snprintf(buf, sizeof(buf), "%d", id(my_level));
          lv_label_set_text(id(big_val), buf);
```

---

### Bestaande referentie-schermen in dit systeem
- **Afzuigkap** — archetype *bediening* (segment-kolommen, cyaan/amber).
- **Weerstation** — archetype *dashboard* (hero + buienradar-chart + zon-arc + 5-daagse range-balken).
- **Immich-fotolijst** — archetype *ambient* (full-bleed beeld + klok-overlay).

Houd nieuwe schermen herkenbaar als lid van deze familie.
