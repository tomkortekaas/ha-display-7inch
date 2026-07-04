# HA Display 7" — Full README Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `esphome/ha-display-7.yaml` to exact visual parity with the README design spec across all 3 active screens (Energie, Verlichting, Media) plus the persistent chrome (nav + statusbalk).

**Architecture:** Single YAML file (`esphome/ha-display-7.yaml`). All sensor state lives in Home Assistant, mirrored via `homeassistant:` platform sensors. All LVGL updates happen in `interval: 3s` blocks — never `on_value`. Widget interaction calls `homeassistant.service:` directly.

**Tech Stack:** ESPHome 2026.3+, LVGL, ESP32-P4 (Guition JC1060P470), Inter font via `gfonts://`, JetBrains Mono via `gfonts://`

---

## Known entity IDs (gebruik altijd deze — nooit gokken)

| Sensor | Entity ID | Waarde |
|--------|-----------|--------|
| Verbruik nu | `sensor.electricity_meter_energieverbruik` | kW |
| Productie nu | `sensor.electricity_meter_energieproductie` | kW |
| Gas nu | `sensor.gasverbruik_nu` | m³/h |
| Kosten vandaag | `sensor.kosten_stroom_vandaag` | € |
| Kosten maand | `sensor.kosten_stroom_deze_maand` | € |
| Binnentemperatuur | `sensor.hal_sensor_temperatuur` | °C |
| Buitentemperatuur | `sensor.weerstation_temperature` | °C |
| Media speler | `media_player.keuken_amp` | — |
| Lights (display) | `light.woonkamer`, `light.keuken`, `light.eettafel`, `light.hal`, `light.veranda`, `light.kantoor` | — |
| Scènes (display) | `scene.woonkamer_ontspannen`, `scene.woonkamer_gedimd`, `scene.woonkamer_lezen`, `scene.woonkamer_helder` | — |

## Niet beschikbaar in HA (niet implementeren)
- Water meter (geen sensor)
- Solar kWh vandaag (geen dagelijkse sensor, alleen live kW)
- Nordpool dynamische prijs (niet geconfigureerd)
- Daily import/export kWh (geen utility meter)

## Arc track kleuren (13% alpha over zwart — exact per README)
| Accent | Accent hex | Track hex (13% α) |
|--------|------------|-------------------|
| Power purple | `0x8A4DFF` | `0x120A21` |
| Solar green | `0x2EE36A` | `0x061D0E` |
| Gas pink | `0xFF2A7A` | `0x210510` |
| Cost amber | `0xFFD84A` | `0x211C0A` |
| Heat orange | `0xFF8A3A` | `0x211208` |

---

## Task 1: Arc visuele fixes

**Doel:** Hero arc 250px/18px stroke, track kleuren 13% alpha, solar arc 130px/12px  
**Bestand:** `esphome/ha-display-7.yaml`

- [ ] **Stap 1: Hero arc grootte aanpassen**

Zoek `id: arc_verbruik` en pas aan:
```yaml
- arc:
    id: arc_verbruik
    align: TOP_MID
    y: 30
    width: 250        # was 240
    height: 250       # was 240
    arc_color: 0x120A21   # was 0x2d2d2d — power purple 13% alpha
    arc_width: 18     # was 16
    start_angle: 135
    end_angle: 45
    min_value: 0
    max_value: 6000
    value: 0
    adjustable: false
    indicator:
      arc_color: 0x8A4DFF
      arc_width: 18   # was 16
```

- [ ] **Stap 2: Solar arc track kleur aanpassen**

Zoek `id: arc_solar` en wijzig `arc_color`:
```yaml
arc_color: 0x061D0E   # was 0x2d2d2d — solar green 13% alpha
```

- [ ] **Stap 3: Gas arc track kleur aanpassen**

Zoek `id: arc_gas` en wijzig `arc_color`:
```yaml
arc_color: 0x210510   # was 0x2d2d2d — gas pink 13% alpha
```

- [ ] **Stap 4: Flash en controleer visueel**

Arc tracks moeten nu een subtiele gekleurde gloed hebben i.p.v. solide grijs.

---

## Task 2: Statusbalk — buitentemp + HA-dot

**Doel:** Statusbalk rechts toont: `14° · 286 W · ●`  
**Bestand:** `esphome/ha-display-7.yaml`

- [ ] **Stap 1: Buitentemperatuur sensor toevoegen**

Voeg toe in het `sensor:` blok:
```yaml
  - platform: homeassistant
    id: ha_buiten_temp
    entity_id: sensor.weerstation_temperature
    internal: true
  - platform: homeassistant
    id: ha_binnen_temp
    entity_id: sensor.hal_sensor_temperatuur
    internal: true
```

- [ ] **Stap 2: Statusbalk widgets uitbreiden**

Vervang de huidige statusbalk `widgets:` sectie (in `top_layer`) volledig:
```yaml
          widgets:
            - label:
                id: lbl_clock
                align: LEFT_MID
                x: 20
                text_font: font_inter_28
                text_color: 0xFFFFFF
                text: "--:--"
            - label:
                id: lbl_date
                align: LEFT_MID
                x: 130
                text_font: font_inter_16
                text_color: 0x8a8a93
                text: "—"
            # Rechts: buiten · W · HA-dot
            - obj:
                align: RIGHT_MID
                x: -16
                width: 300
                height: 40
                bg_color: 0x0d0d10
                bg_opa: COVER
                border_width: 0
                pad_all: 0
                layout:
                  type: FLEX
                  flex_flow: ROW
                  flex_align_main: END
                  flex_align_cross: CENTER
                  pad_column: 14
                widgets:
                  - label:
                      id: lbl_buiten_temp
                      text_font: font_inter_16
                      text_color: 0x8a8a93
                      text: "--°"
                  - label:
                      id: lbl_power_status
                      text_font: font_inter_16
                      text_color: 0x8A4DFF
                      text: "-- W"
                  - label:
                      id: lbl_ha_dot
                      text_font: font_inter_16
                      text_color: 0xFF2A7A
                      text: "HA"
```

- [ ] **Stap 3: Interval updates toevoegen voor nieuwe labels**

Voeg toe in het `interval: 3s` blok:
```yaml
      - lvgl.label.update:
          id: lbl_buiten_temp
          text: !lambda |-
            float v = id(ha_buiten_temp).state;
            if (isnan(v)) return std::string("--°");
            char buf[8];
            snprintf(buf, sizeof(buf), "%.0f°", v);
            return std::string(buf);
      - lvgl.label.update:
          id: lbl_ha_dot
          text_color: !lambda |-
            return App.is_connected() ? (int)0x2EE36A : (int)0xFF2A7A;
```

- [ ] **Stap 4: Flash en controleer statusbalk**

---

## Task 3: Nav rail — logo vierkant + actieve staat + onderkant

**Doel:** Exacte nav per README: 44×44 paars afgerond logo, actieve pagina-indicator (3px strip links), "ESP32-P4" label onderaan

**Bestand:** `esphome/ha-display-7.yaml`

- [ ] **Stap 1: Logo vervangen door afgerond vierkant**

Vervang de `# Logo` label in de nav rail:
```yaml
            # Logo — 44×44 afgerond paars vierkant
            - obj:
                align: TOP_MID
                y: 12
                width: 44
                height: 44
                radius: 10
                bg_color: 0x8A4DFF
                bg_opa: COVER
                border_width: 0
                widgets:
                  - label:
                      align: CENTER
                      text_font: font_inter_28
                      text_color: 0xFFFFFF
                      text: "H"
```

- [ ] **Stap 2: Actieve indicator per knop toevoegen**

Vervang de drie nav buttons volledig. Elke knop krijgt een `obj` wrapper die de 3px accent-strip links bevat:
```yaml
            # Energie — actief (paarse strip links)
            - obj:
                x: 0
                y: 72
                width: 88
                height: 64
                bg_color: 0x1A1020
                bg_opa: COVER
                border_width: 0
                pad_all: 0
                widgets:
                  - obj:
                      id: nav_strip_energie
                      x: 0
                      y: 4
                      width: 3
                      height: 56
                      bg_color: 0x8A4DFF
                      bg_opa: COVER
                      border_width: 0
                  - button:
                      id: nav_energie
                      x: 16
                      y: 4
                      width: 56
                      height: 56
                      radius: 10
                      bg_color: 0x2A1A50
                      bg_opa: COVER
                      on_press:
                        then:
                          - lvgl.page.show: page_energy
                      widgets:
                        - label:
                            align: CENTER
                            text_font: font_inter_16
                            text_color: 0x8A4DFF
                            text: "E"
            # Lichten — inactief
            - obj:
                x: 0
                y: 148
                width: 88
                height: 64
                bg_color: 0x060608
                bg_opa: COVER
                border_width: 0
                pad_all: 0
                widgets:
                  - obj:
                      id: nav_strip_lichten
                      x: 0
                      y: 4
                      width: 3
                      height: 56
                      bg_color: 0x060608
                      bg_opa: COVER
                      border_width: 0
                  - button:
                      id: nav_lichten
                      x: 16
                      y: 4
                      width: 56
                      height: 56
                      radius: 10
                      bg_color: 0x1a1a1a
                      bg_opa: COVER
                      on_press:
                        then:
                          - lvgl.page.show: page_lights
                      widgets:
                        - label:
                            align: CENTER
                            text_font: font_inter_16
                            text_color: 0x8a8a93
                            text: "L"
            # Media — inactief
            - obj:
                x: 0
                y: 224
                width: 88
                height: 64
                bg_color: 0x060608
                bg_opa: COVER
                border_width: 0
                pad_all: 0
                widgets:
                  - obj:
                      id: nav_strip_media
                      x: 0
                      y: 4
                      width: 3
                      height: 56
                      bg_color: 0x060608
                      bg_opa: COVER
                      border_width: 0
                  - button:
                      id: nav_media
                      x: 16
                      y: 4
                      width: 56
                      height: 56
                      radius: 10
                      bg_color: 0x1a1a1a
                      bg_opa: COVER
                      on_press:
                        then:
                          - lvgl.page.show: page_media
                      widgets:
                        - label:
                            align: CENTER
                            text_font: font_inter_16
                            text_color: 0x8a8a93
                            text: "M"
```

- [ ] **Stap 3: Actieve pagina bijhouden via on_press acties**

Voeg aan elke nav button `on_press` extra acties toe voor strip-kleur wisselen:

Bij `nav_energie on_press`:
```yaml
                        then:
                          - lvgl.page.show: page_energy
                          # Energie actief
                          - lvgl.obj.update:
                              id: nav_strip_energie
                              bg_color: 0x8A4DFF
                          - lvgl.obj.update:
                              id: nav_energie
                              bg_color: 0x2A1A50
                          # Lichten inactief
                          - lvgl.obj.update:
                              id: nav_strip_lichten
                              bg_color: 0x060608
                          - lvgl.obj.update:
                              id: nav_lichten
                              bg_color: 0x1a1a1a
                          # Media inactief
                          - lvgl.obj.update:
                              id: nav_strip_media
                              bg_color: 0x060608
                          - lvgl.obj.update:
                              id: nav_media
                              bg_color: 0x1a1a1a
```

Herhaal (met juiste actief/inactief wisseling) voor `nav_lichten` en `nav_media`.

- [ ] **Stap 4: Onderkant nav toevoegen**

Voeg onderaan de nav rail widgets toe:
```yaml
            # Onderkant — versie label
            - label:
                align: BOTTOM_MID
                y: -40
                text_font: font_inter_16
                text_color: 0x4a4a52
                text: "P4"
```

- [ ] **Stap 5: Flash en controleer nav**

---

## Task 4: Energie rechter kolom — bar widgets

**Doel:** 4 metrics met `bar` widget (icon + groot getal + dunne gekleurde balk) zoals README  
**Bestand:** `esphome/ha-display-7.yaml`

README spec rechter kolom:
1. Kosten vandaag (€) — amber `0xFFD84A`
2. Verbruik nu (kW) — purple `0x8A4DFF`
3. Productie nu (kW) — green `0x2EE36A`
4. Binnentemperatuur (°C) — orange `0xFF8A3A`

- [ ] **Stap 1: Sensor binnentemperatuur controleren**

`sensor.hal_sensor_temperatuur` staat al in Task 2 stap 1. Controleer dat `id: ha_binnen_temp` aanwezig is in het sensor blok.

- [ ] **Stap 2: Rechter kolom volledig vervangen**

Zoek de `# RECHTS — Kosten samenvatting` sectie en vervang het volledige `obj` (x: 636) door:
```yaml
              # RECHTS — 4 bar metrics
              - obj:
                  x: 636
                  y: 16
                  width: 284
                  height: 512
                  bg_color: 0x0d0d10
                  bg_opa: COVER
                  radius: 18
                  border_width: 0
                  pad_all: 20
                  pad_row: 0
                  layout:
                    type: FLEX
                    flex_flow: COLUMN
                    flex_align_main: SPACE_EVENLY
                    flex_align_cross: START
                  widgets:
                    # Metric 1: Kosten vandaag
                    - obj:
                        width: 244
                        height: 100
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        widgets:
                          - label:
                              x: 0
                              y: 0
                              text_font: font_inter_16
                              text_color: 0x8a8a93
                              text: "KOSTEN VANDAAG"
                          - label:
                              id: lbl_cost_groot
                              x: 0
                              y: 22
                              text_font: font_inter_36
                              text_color: 0xFFD84A
                              text: "-- €"
                          - bar:
                              id: bar_kosten
                              x: 0
                              y: 72
                              width: 244
                              height: 6
                              radius: 3
                              min_value: 0
                              max_value: 100
                              value: 0
                              bg_color: 0x211C0A
                              bg_opa: COVER
                              indicator:
                                bg_color: 0xFFD84A
                                bg_opa: COVER
                    # Metric 2: Verbruik nu
                    - obj:
                        width: 244
                        height: 100
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        widgets:
                          - label:
                              x: 0
                              y: 0
                              text_font: font_inter_16
                              text_color: 0x8a8a93
                              text: "VERBRUIK NU"
                          - label:
                              id: lbl_vb_rechts
                              x: 0
                              y: 22
                              text_font: font_inter_36
                              text_color: 0x8A4DFF
                              text: "-- kW"
                          - bar:
                              id: bar_verbruik
                              x: 0
                              y: 72
                              width: 244
                              height: 6
                              radius: 3
                              min_value: 0
                              max_value: 100
                              value: 0
                              bg_color: 0x120A21
                              bg_opa: COVER
                              indicator:
                                bg_color: 0x8A4DFF
                                bg_opa: COVER
                    # Metric 3: Productie nu
                    - obj:
                        width: 244
                        height: 100
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        widgets:
                          - label:
                              x: 0
                              y: 0
                              text_font: font_inter_16
                              text_color: 0x8a8a93
                              text: "PRODUCTIE NU"
                          - label:
                              id: lbl_prod_rechts
                              x: 0
                              y: 22
                              text_font: font_inter_36
                              text_color: 0x2EE36A
                              text: "-- kW"
                          - bar:
                              id: bar_productie
                              x: 0
                              y: 72
                              width: 244
                              height: 6
                              radius: 3
                              min_value: 0
                              max_value: 100
                              value: 0
                              bg_color: 0x061D0E
                              bg_opa: COVER
                              indicator:
                                bg_color: 0x2EE36A
                                bg_opa: COVER
                    # Metric 4: Binnentemperatuur
                    - obj:
                        width: 244
                        height: 100
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        widgets:
                          - label:
                              x: 0
                              y: 0
                              text_font: font_inter_16
                              text_color: 0x8a8a93
                              text: "BINNEN"
                          - label:
                              id: lbl_binnen_temp
                              x: 0
                              y: 22
                              text_font: font_inter_36
                              text_color: 0xFF8A3A
                              text: "--°C"
                          - bar:
                              id: bar_temp
                              x: 0
                              y: 72
                              width: 244
                              height: 6
                              radius: 3
                              min_value: 0
                              max_value: 100
                              value: 0
                              bg_color: 0x211208
                              bg_opa: COVER
                              indicator:
                                bg_color: 0xFF8A3A
                                bg_opa: COVER
```

- [ ] **Stap 3: Interval updates toevoegen voor nieuwe labels + bars**

Voeg toe in `interval: 3s`:
```yaml
      # Rechter kolom bars
      - lvgl.label.update:
          id: lbl_cost_groot
          text: !lambda |-
            float v = id(ha_kosten_vandaag).state;
            if (isnan(v)) return std::string("-- \xe2\x82\xac");
            char buf[12];
            snprintf(buf, sizeof(buf), "%.2f \xe2\x82\xac", v);
            return std::string(buf);
      - lvgl.bar.update:
          id: bar_kosten
          value: !lambda |-
            float v = id(ha_kosten_vandaag).state;
            if (isnan(v)) return 0;
            // schaal: max €20/dag = 100%
            return (int)std::min(std::max(v / 20.0f * 100.0f, 0.0f), 100.0f);
      - lvgl.bar.update:
          id: bar_verbruik
          value: !lambda |-
            float v = id(ha_verbruik).state;
            if (isnan(v)) return 0;
            // schaal: max 6kW = 100%
            return (int)std::min(v / 6.0f * 100.0f, 100.0f);
      - lvgl.bar.update:
          id: bar_productie
          value: !lambda |-
            float v = id(ha_productie).state;
            if (isnan(v)) return 0;
            // schaal: max 5kW = 100%
            return (int)std::min(v / 5.0f * 100.0f, 100.0f);
      - lvgl.label.update:
          id: lbl_binnen_temp
          text: !lambda |-
            float v = id(ha_binnen_temp).state;
            if (isnan(v)) return std::string("--\xc2\xb0\x43");
            char buf[8];
            snprintf(buf, sizeof(buf), "%.1f\xc2\xb0\x43", v);
            return std::string(buf);
      - lvgl.bar.update:
          id: bar_temp
          value: !lambda |-
            float v = id(ha_binnen_temp).state;
            if (isnan(v)) return 0;
            // schaal: 10°C=0%, 30°C=100%
            return (int)std::min(std::max((v - 10.0f) / 20.0f * 100.0f, 0.0f), 100.0f);
```

- [ ] **Stap 4: Verwijder oude rechter kolom labels uit interval**

Verwijder de nu dubbele updates voor `lbl_cost_groot`, `lbl_cost_maand_groot`, `lbl_vb_rechts`, `lbl_prod_rechts`, `lbl_gas_rechts` uit het interval blok (die IDs bestaan niet meer).

- [ ] **Stap 5: Flash en controleer energie rechter kolom**

---

## Task 5: Verlichtings-scherm — volledige heropbouw

**Doel:** Exacte README layout: 2-kolom (1.8fr lichten + 1fr scènes), tiles met swatch + brightness slider, "Alles uit" knop, 4 scène-tiles

**Bestand:** `esphome/ha-display-7.yaml`

- [ ] **Stap 1: Light brightness sensors toevoegen**

Voeg toe in `sensor:` blok:
```yaml
  - platform: homeassistant
    id: light_woonkamer_bri
    entity_id: light.woonkamer
    attribute: brightness
    internal: true
  - platform: homeassistant
    id: light_keuken_bri
    entity_id: light.keuken
    attribute: brightness
    internal: true
  - platform: homeassistant
    id: light_eettafel_bri
    entity_id: light.eettafel
    attribute: brightness
    internal: true
  - platform: homeassistant
    id: light_hal_bri
    entity_id: light.hal
    attribute: brightness
    internal: true
  - platform: homeassistant
    id: light_veranda_bri
    entity_id: light.veranda
    attribute: brightness
    internal: true
  - platform: homeassistant
    id: light_kantoor_bri
    entity_id: light.kantoor
    attribute: brightness
    internal: true
```

- [ ] **Stap 2: page_lights volledig vervangen**

Vervang de volledige `page_lights` definitie:
```yaml
    - id: page_lights
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        - obj:
            x: 88
            y: 56
            width: 936
            height: 544
            bg_color: 0x000000
            bg_opa: COVER
            border_width: 0
            pad_all: 16
            scrollable: false
            layout:
              type: FLEX
              flex_flow: ROW
              flex_align_main: START
              flex_align_cross: START
            widgets:

              # LINKS — Verlichting card (1.8fr = ~620px)
              - obj:
                  width: 612
                  height: 512
                  bg_color: 0x0d0d10
                  bg_opa: COVER
                  radius: 18
                  border_width: 0
                  pad_all: 16
                  scrollable: false
                  widgets:
                    # Header
                    - obj:
                        x: 0
                        y: 0
                        width: 580
                        height: 44
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        widgets:
                          - label:
                              align: LEFT_MID
                              text_font: font_inter_20
                              text_color: 0xFFFFFF
                              text: "VERLICHTING"
                          - button:
                              id: btn_alles_uit
                              align: RIGHT_MID
                              width: 110
                              height: 36
                              radius: 8
                              bg_color: 0x1f1f26
                              bg_opa: COVER
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.turn_off
                                      data:
                                        entity_id: >
                                          light.woonkamer,light.keuken,light.eettafel,
                                          light.hal,light.veranda,light.kantoor
                              widgets:
                                - label:
                                    align: CENTER
                                    text_font: font_inter_16
                                    text_color: 0x8a8a93
                                    text: "Alles uit"
                    # Licht tiles grid (2 kolommen)
                    - obj:
                        x: 0
                        y: 52
                        width: 580
                        height: 444
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        scrollable: false
                        layout:
                          type: FLEX
                          flex_flow: ROW_WRAP
                          flex_align_main: START
                          flex_align_cross: START
                        widgets:
                          # Tile: Woonkamer
                          - obj:
                              id: tile_woonkamer
                              width: 278
                              height: 130
                              margin_right: 8
                              margin_bottom: 8
                              bg_color: 0x14141a
                              bg_opa: COVER
                              radius: 12
                              border_width: 0
                              pad_all: 12
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.toggle
                                      data:
                                        entity_id: light.woonkamer
                              widgets:
                                - obj:
                                    id: swatch_woonkamer
                                    align: TOP_LEFT
                                    width: 28
                                    height: 28
                                    radius: 14
                                    bg_color: 0x3a3a3a
                                    bg_opa: COVER
                                    border_width: 0
                                - label:
                                    id: lbl_name_woonkamer
                                    x: 40
                                    y: 4
                                    text_font: font_inter_16
                                    text_color: 0xFFFFFF
                                    text: "Woonkamer"
                                - label:
                                    x: 40
                                    y: 22
                                    text_font: font_mono_12
                                    text_color: 0x4a4a52
                                    text: "light.woonkamer"
                                - slider:
                                    id: slider_woonkamer
                                    align: BOTTOM_MID
                                    y: -4
                                    width: 240
                                    height: 8
                                    min_value: 0
                                    max_value: 255
                                    value: 0
                                    bg_color: 0x2d2d2d
                                    bg_opa: COVER
                                    indicator:
                                      bg_color: 0x8A4DFF
                                      bg_opa: COVER
                                    knob:
                                      bg_color: 0xFFFFFF
                                      bg_opa: COVER
                                    on_release:
                                      then:
                                        - homeassistant.service:
                                            service: light.turn_on
                                            data:
                                              entity_id: light.woonkamer
                                              brightness: !lambda 'return (int)x;'
                          # Tile: Keuken
                          - obj:
                              id: tile_keuken
                              width: 278
                              height: 130
                              margin_right: 8
                              margin_bottom: 8
                              bg_color: 0x14141a
                              bg_opa: COVER
                              radius: 12
                              border_width: 0
                              pad_all: 12
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.toggle
                                      data:
                                        entity_id: light.keuken
                              widgets:
                                - obj:
                                    id: swatch_keuken
                                    align: TOP_LEFT
                                    width: 28
                                    height: 28
                                    radius: 14
                                    bg_color: 0x3a3a3a
                                    bg_opa: COVER
                                    border_width: 0
                                - label:
                                    x: 40
                                    y: 4
                                    text_font: font_inter_16
                                    text_color: 0xFFFFFF
                                    text: "Keuken"
                                - label:
                                    x: 40
                                    y: 22
                                    text_font: font_mono_12
                                    text_color: 0x4a4a52
                                    text: "light.keuken"
                                - slider:
                                    id: slider_keuken
                                    align: BOTTOM_MID
                                    y: -4
                                    width: 240
                                    height: 8
                                    min_value: 0
                                    max_value: 255
                                    value: 0
                                    bg_color: 0x2d2d2d
                                    bg_opa: COVER
                                    indicator:
                                      bg_color: 0x8A4DFF
                                      bg_opa: COVER
                                    knob:
                                      bg_color: 0xFFFFFF
                                      bg_opa: COVER
                                    on_release:
                                      then:
                                        - homeassistant.service:
                                            service: light.turn_on
                                            data:
                                              entity_id: light.keuken
                                              brightness: !lambda 'return (int)x;'
                          # Tile: Eettafel
                          - obj:
                              id: tile_eettafel
                              width: 278
                              height: 130
                              margin_right: 8
                              margin_bottom: 8
                              bg_color: 0x14141a
                              bg_opa: COVER
                              radius: 12
                              border_width: 0
                              pad_all: 12
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.toggle
                                      data:
                                        entity_id: light.eettafel
                              widgets:
                                - obj:
                                    id: swatch_eettafel
                                    align: TOP_LEFT
                                    width: 28
                                    height: 28
                                    radius: 14
                                    bg_color: 0x3a3a3a
                                    bg_opa: COVER
                                    border_width: 0
                                - label:
                                    x: 40
                                    y: 4
                                    text_font: font_inter_16
                                    text_color: 0xFFFFFF
                                    text: "Eettafel"
                                - label:
                                    x: 40
                                    y: 22
                                    text_font: font_mono_12
                                    text_color: 0x4a4a52
                                    text: "light.eettafel"
                                - slider:
                                    id: slider_eettafel
                                    align: BOTTOM_MID
                                    y: -4
                                    width: 240
                                    height: 8
                                    min_value: 0
                                    max_value: 255
                                    value: 0
                                    bg_color: 0x2d2d2d
                                    bg_opa: COVER
                                    indicator:
                                      bg_color: 0x8A4DFF
                                      bg_opa: COVER
                                    knob:
                                      bg_color: 0xFFFFFF
                                      bg_opa: COVER
                                    on_release:
                                      then:
                                        - homeassistant.service:
                                            service: light.turn_on
                                            data:
                                              entity_id: light.eettafel
                                              brightness: !lambda 'return (int)x;'
                          # Tile: Hal
                          - obj:
                              id: tile_hal
                              width: 278
                              height: 130
                              margin_right: 8
                              margin_bottom: 8
                              bg_color: 0x14141a
                              bg_opa: COVER
                              radius: 12
                              border_width: 0
                              pad_all: 12
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.toggle
                                      data:
                                        entity_id: light.hal
                              widgets:
                                - obj:
                                    id: swatch_hal
                                    align: TOP_LEFT
                                    width: 28
                                    height: 28
                                    radius: 14
                                    bg_color: 0x3a3a3a
                                    bg_opa: COVER
                                    border_width: 0
                                - label:
                                    x: 40
                                    y: 4
                                    text_font: font_inter_16
                                    text_color: 0xFFFFFF
                                    text: "Hal"
                                - label:
                                    x: 40
                                    y: 22
                                    text_font: font_mono_12
                                    text_color: 0x4a4a52
                                    text: "light.hal"
                                - slider:
                                    id: slider_hal
                                    align: BOTTOM_MID
                                    y: -4
                                    width: 240
                                    height: 8
                                    min_value: 0
                                    max_value: 255
                                    value: 0
                                    bg_color: 0x2d2d2d
                                    bg_opa: COVER
                                    indicator:
                                      bg_color: 0x8A4DFF
                                      bg_opa: COVER
                                    knob:
                                      bg_color: 0xFFFFFF
                                      bg_opa: COVER
                                    on_release:
                                      then:
                                        - homeassistant.service:
                                            service: light.turn_on
                                            data:
                                              entity_id: light.hal
                                              brightness: !lambda 'return (int)x;'
                          # Tile: Veranda
                          - obj:
                              id: tile_veranda
                              width: 278
                              height: 130
                              margin_right: 8
                              margin_bottom: 8
                              bg_color: 0x14141a
                              bg_opa: COVER
                              radius: 12
                              border_width: 0
                              pad_all: 12
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.toggle
                                      data:
                                        entity_id: light.veranda
                              widgets:
                                - obj:
                                    id: swatch_veranda
                                    align: TOP_LEFT
                                    width: 28
                                    height: 28
                                    radius: 14
                                    bg_color: 0x3a3a3a
                                    bg_opa: COVER
                                    border_width: 0
                                - label:
                                    x: 40
                                    y: 4
                                    text_font: font_inter_16
                                    text_color: 0xFFFFFF
                                    text: "Veranda"
                                - label:
                                    x: 40
                                    y: 22
                                    text_font: font_mono_12
                                    text_color: 0x4a4a52
                                    text: "light.veranda"
                                - slider:
                                    id: slider_veranda
                                    align: BOTTOM_MID
                                    y: -4
                                    width: 240
                                    height: 8
                                    min_value: 0
                                    max_value: 255
                                    value: 0
                                    bg_color: 0x2d2d2d
                                    bg_opa: COVER
                                    indicator:
                                      bg_color: 0x8A4DFF
                                      bg_opa: COVER
                                    knob:
                                      bg_color: 0xFFFFFF
                                      bg_opa: COVER
                                    on_release:
                                      then:
                                        - homeassistant.service:
                                            service: light.turn_on
                                            data:
                                              entity_id: light.veranda
                                              brightness: !lambda 'return (int)x;'
                          # Tile: Kantoor
                          - obj:
                              id: tile_kantoor
                              width: 278
                              height: 130
                              margin_right: 8
                              margin_bottom: 8
                              bg_color: 0x14141a
                              bg_opa: COVER
                              radius: 12
                              border_width: 0
                              pad_all: 12
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: light.toggle
                                      data:
                                        entity_id: light.kantoor
                              widgets:
                                - obj:
                                    id: swatch_kantoor
                                    align: TOP_LEFT
                                    width: 28
                                    height: 28
                                    radius: 14
                                    bg_color: 0x3a3a3a
                                    bg_opa: COVER
                                    border_width: 0
                                - label:
                                    x: 40
                                    y: 4
                                    text_font: font_inter_16
                                    text_color: 0xFFFFFF
                                    text: "Kantoor"
                                - label:
                                    x: 40
                                    y: 22
                                    text_font: font_mono_12
                                    text_color: 0x4a4a52
                                    text: "light.kantoor"
                                - slider:
                                    id: slider_kantoor
                                    align: BOTTOM_MID
                                    y: -4
                                    width: 240
                                    height: 8
                                    min_value: 0
                                    max_value: 255
                                    value: 0
                                    bg_color: 0x2d2d2d
                                    bg_opa: COVER
                                    indicator:
                                      bg_color: 0x8A4DFF
                                      bg_opa: COVER
                                    knob:
                                      bg_color: 0xFFFFFF
                                      bg_opa: COVER
                                    on_release:
                                      then:
                                        - homeassistant.service:
                                            service: light.turn_on
                                            data:
                                              entity_id: light.kantoor
                                              brightness: !lambda 'return (int)x;'

              # RECHTS — Scène tiles (1fr = ~292px)
              - obj:
                  width: 292
                  height: 512
                  bg_color: 0x000000
                  bg_opa: COVER
                  border_width: 0
                  pad_all: 0
                  scrollable: false
                  layout:
                    type: FLEX
                    flex_flow: ROW_WRAP
                    flex_align_main: START
                    flex_align_cross: START
                  widgets:
                    # Scene: Ontspannen
                    - button:
                        width: 136
                        height: 136
                        margin_right: 8
                        margin_bottom: 8
                        radius: 14
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        on_press:
                          then:
                            - homeassistant.service:
                                service: scene.turn_on
                                data:
                                  entity_id: scene.woonkamer_ontspannen
                        widgets:
                          - label:
                              align: CENTER
                              y: -16
                              text_font: font_inter_20
                              text_color: 0x8A4DFF
                              text: "~"
                          - label:
                              align: CENTER
                              y: 10
                              text_font: font_inter_16
                              text_color: 0xFFFFFF
                              text: "Ontspannen"
                    # Scene: Gedimd
                    - button:
                        width: 136
                        height: 136
                        margin_right: 8
                        margin_bottom: 8
                        radius: 14
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        on_press:
                          then:
                            - homeassistant.service:
                                service: scene.turn_on
                                data:
                                  entity_id: scene.woonkamer_gedimd
                        widgets:
                          - label:
                              align: CENTER
                              y: -16
                              text_font: font_inter_20
                              text_color: 0xFFD84A
                              text: "o"
                          - label:
                              align: CENTER
                              y: 10
                              text_font: font_inter_16
                              text_color: 0xFFFFFF
                              text: "Gedimd"
                    # Scene: Lezen
                    - button:
                        width: 136
                        height: 136
                        margin_right: 8
                        margin_bottom: 8
                        radius: 14
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        on_press:
                          then:
                            - homeassistant.service:
                                service: scene.turn_on
                                data:
                                  entity_id: scene.woonkamer_lezen
                        widgets:
                          - label:
                              align: CENTER
                              y: -16
                              text_font: font_inter_20
                              text_color: 0x34D0FF
                              text: "="
                          - label:
                              align: CENTER
                              y: 10
                              text_font: font_inter_16
                              text_color: 0xFFFFFF
                              text: "Lezen"
                    # Scene: Helder
                    - button:
                        width: 136
                        height: 136
                        margin_right: 8
                        margin_bottom: 8
                        radius: 14
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        on_press:
                          then:
                            - homeassistant.service:
                                service: scene.turn_on
                                data:
                                  entity_id: scene.woonkamer_helder
                        widgets:
                          - label:
                              align: CENTER
                              y: -16
                              text_font: font_inter_20
                              text_color: 0x2EE36A
                              text: "*"
                          - label:
                              align: CENTER
                              y: 10
                              text_font: font_inter_16
                              text_color: 0xFFFFFF
                              text: "Helder"
```

- [ ] **Stap 3: Interval updates voor swatch-kleuren + sliders**

Voeg toe in `interval: 3s`:
```yaml
      # Licht swatches en sliders
      - lvgl.obj.update:
          id: swatch_woonkamer
          bg_color: !lambda |-
            return id(light_woonkamer_st).state == "on" ? (int)0x8A4DFF : (int)0x3a3a3a;
      - lvgl.slider.update:
          id: slider_woonkamer
          value: !lambda |-
            float v = id(light_woonkamer_bri).state;
            return isnan(v) ? 0 : (int)v;
      - lvgl.obj.update:
          id: swatch_keuken
          bg_color: !lambda |-
            return id(light_keuken_st).state == "on" ? (int)0x8A4DFF : (int)0x3a3a3a;
      - lvgl.slider.update:
          id: slider_keuken
          value: !lambda |-
            float v = id(light_keuken_bri).state;
            return isnan(v) ? 0 : (int)v;
      - lvgl.obj.update:
          id: swatch_eettafel
          bg_color: !lambda |-
            return id(light_eettafel_st).state == "on" ? (int)0x8A4DFF : (int)0x3a3a3a;
      - lvgl.slider.update:
          id: slider_eettafel
          value: !lambda |-
            float v = id(light_eettafel_bri).state;
            return isnan(v) ? 0 : (int)v;
      - lvgl.obj.update:
          id: swatch_hal
          bg_color: !lambda |-
            return id(light_hal_st).state == "on" ? (int)0x8A4DFF : (int)0x3a3a3a;
      - lvgl.slider.update:
          id: slider_hal
          value: !lambda |-
            float v = id(light_hal_bri).state;
            return isnan(v) ? 0 : (int)v;
      - lvgl.obj.update:
          id: swatch_veranda
          bg_color: !lambda |-
            return id(light_veranda_st).state == "on" ? (int)0x8A4DFF : (int)0x3a3a3a;
      - lvgl.slider.update:
          id: slider_veranda
          value: !lambda |-
            float v = id(light_veranda_bri).state;
            return isnan(v) ? 0 : (int)v;
      - lvgl.obj.update:
          id: swatch_kantoor
          bg_color: !lambda |-
            return id(light_kantoor_st).state == "on" ? (int)0x8A4DFF : (int)0x3a3a3a;
      - lvgl.slider.update:
          id: slider_kantoor
          value: !lambda |-
            float v = id(light_kantoor_bri).state;
            return isnan(v) ? 0 : (int)v;
```

- [ ] **Stap 4: Verwijder oude `page_lights` button-gebaseerde widgets uit interval**

Verwijder de labels `lbl_st_woonkamer`, `lbl_st_keuken`, etc. uit het `interval: 3s` blok — die IDs bestaan niet meer.

- [ ] **Stap 5: Flash en controleer lichtenscherm**

---

## Task 6: Media-scherm — volume, voortgang, shuffle/repeat

**Doel:** Gradient placeholder links, voortgangsbalk, shuffle/repeat knoppen, volume slider  
**Bestand:** `esphome/ha-display-7.yaml`

- [ ] **Stap 1: Media positie/duur sensors toevoegen**

Voeg toe in `sensor:` blok:
```yaml
  - platform: homeassistant
    id: media_positie
    entity_id: media_player.keuken_amp
    attribute: media_position
    internal: true
  - platform: homeassistant
    id: media_duur
    entity_id: media_player.keuken_amp
    attribute: media_duration
    internal: true
  - platform: homeassistant
    id: media_volume
    entity_id: media_player.keuken_amp
    attribute: volume_level
    internal: true
```

- [ ] **Stap 2: page_media volledig vervangen**

Vervang de volledige `page_media`:
```yaml
    - id: page_media
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        - obj:
            x: 88
            y: 56
            width: 936
            height: 544
            bg_color: 0x000000
            bg_opa: COVER
            border_width: 0
            pad_all: 16
            scrollable: false
            layout:
              type: FLEX
              flex_flow: ROW
              flex_align_main: START
              flex_align_cross: START
            widgets:
              # LINKS — Album art placeholder (320px)
              - obj:
                  width: 296
                  height: 512
                  bg_color: 0x1A0A30
                  bg_opa: COVER
                  radius: 18
                  border_width: 0
                  widgets:
                    - obj:
                        align: TOP_MID
                        y: 20
                        width: 256
                        height: 256
                        bg_color: 0x2A1A50
                        bg_opa: COVER
                        radius: 14
                        border_width: 0
                        widgets:
                          - label:
                              align: CENTER
                              text_font: font_inter_48
                              text_color: 0x8A4DFF
                              text: "M"
                    - label:
                        align: BOTTOM_MID
                        y: -60
                        text_font: font_inter_16
                        text_color: 0x8a8a93
                        text: "Speelt af op"
                    - label:
                        align: BOTTOM_MID
                        y: -36
                        text_font: font_inter_16
                        text_color: 0xFFFFFF
                        text: "Keuken Amp"
                    - label:
                        align: BOTTOM_MID
                        y: -14
                        text_font: font_mono_12
                        text_color: 0x4a4a52
                        text: "media_player.keuken_amp"

              # RECHTS — Track info + transport
              - obj:
                  width: 608
                  height: 512
                  bg_color: 0x0d0d10
                  bg_opa: COVER
                  radius: 18
                  border_width: 0
                  pad_all: 28
                  scrollable: false
                  widgets:
                    - label:
                        id: lbl_track_titel
                        x: 0
                        y: 0
                        width: 552
                        text_font: font_inter_36
                        text_color: 0xFFFFFF
                        long_mode: SCROLL_CIRCULAR
                        text: "—"
                    - label:
                        id: lbl_track_artiest
                        x: 0
                        y: 52
                        width: 552
                        text_font: font_inter_20
                        text_color: 0x8a8a93
                        text: "—"
                    # Voortgangsbalk
                    - bar:
                        id: bar_media_progress
                        x: 0
                        y: 100
                        width: 552
                        height: 6
                        radius: 3
                        min_value: 0
                        max_value: 100
                        value: 0
                        bg_color: 0x1f1f26
                        bg_opa: COVER
                        indicator:
                          bg_color: 0x2EE36A
                          bg_opa: COVER
                    - label:
                        id: lbl_elapsed
                        x: 0
                        y: 114
                        text_font: font_mono_12
                        text_color: 0x4a4a52
                        text: "0:00"
                    - label:
                        id: lbl_remaining
                        align: TOP_RIGHT
                        y: 114
                        text_font: font_mono_12
                        text_color: 0x4a4a52
                        text: "0:00"
                    # Transport row
                    - obj:
                        x: 0
                        y: 170
                        width: 552
                        height: 88
                        bg_color: 0x0d0d10
                        bg_opa: COVER
                        border_width: 0
                        pad_all: 0
                        layout:
                          type: FLEX
                          flex_flow: ROW
                          flex_align_main: CENTER
                          flex_align_cross: CENTER
                          pad_column: 16
                        widgets:
                          # Shuffle
                          - button:
                              width: 48
                              height: 48
                              radius: 24
                              bg_color: 0x1a1a1a
                              bg_opa: COVER
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: media_player.shuffle_set
                                      data:
                                        entity_id: media_player.keuken_amp
                                        shuffle: "true"
                              widgets:
                                - label:
                                    align: CENTER
                                    text_font: font_inter_16
                                    text_color: 0x8a8a93
                                    text: ">>"
                          # Vorige
                          - button:
                              width: 56
                              height: 56
                              radius: 28
                              bg_color: 0x1a1a1a
                              bg_opa: COVER
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: media_player.media_previous_track
                                      data:
                                        entity_id: media_player.keuken_amp
                              widgets:
                                - label:
                                    align: CENTER
                                    text_font: font_inter_20
                                    text_color: 0xFFFFFF
                                    text: "|<"
                          # Play/Pause (groot wit)
                          - button:
                              id: btn_play_pause
                              width: 80
                              height: 80
                              radius: 40
                              bg_color: 0xFFFFFF
                              bg_opa: COVER
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: media_player.media_play_pause
                                      data:
                                        entity_id: media_player.keuken_amp
                              widgets:
                                - label:
                                    id: lbl_play_icoon
                                    align: CENTER
                                    text_font: font_inter_20
                                    text_color: 0x000000
                                    text: "> "
                          # Volgende
                          - button:
                              width: 56
                              height: 56
                              radius: 28
                              bg_color: 0x1a1a1a
                              bg_opa: COVER
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: media_player.media_next_track
                                      data:
                                        entity_id: media_player.keuken_amp
                              widgets:
                                - label:
                                    align: CENTER
                                    text_font: font_inter_20
                                    text_color: 0xFFFFFF
                                    text: ">|"
                          # Repeat
                          - button:
                              width: 48
                              height: 48
                              radius: 24
                              bg_color: 0x1a1a1a
                              bg_opa: COVER
                              on_press:
                                then:
                                  - homeassistant.service:
                                      service: media_player.repeat_set
                                      data:
                                        entity_id: media_player.keuken_amp
                                        repeat: "all"
                              widgets:
                                - label:
                                    align: CENTER
                                    text_font: font_inter_16
                                    text_color: 0x8a8a93
                                    text: "R"
                    # Volume slider
                    - label:
                        x: 0
                        y: 290
                        text_font: font_inter_16
                        text_color: 0x8a8a93
                        text: "VOLUME"
                    - slider:
                        id: slider_volume
                        x: 0
                        y: 318
                        width: 552
                        height: 8
                        min_value: 0
                        max_value: 100
                        value: 50
                        bg_color: 0x1f1f26
                        bg_opa: COVER
                        indicator:
                          bg_color: 0x2EE36A
                          bg_opa: COVER
                        knob:
                          bg_color: 0xFFFFFF
                          bg_opa: COVER
                        on_release:
                          then:
                            - homeassistant.service:
                                service: media_player.volume_set
                                data:
                                  entity_id: media_player.keuken_amp
                                  volume_level: !lambda 'return x / 100.0f;'
```

- [ ] **Stap 3: Interval updates voor voortgang, volume, play-icoon**

Voeg toe in `interval: 3s`:
```yaml
      # Media voortgang
      - lvgl.bar.update:
          id: bar_media_progress
          value: !lambda |-
            float pos = id(media_positie).state;
            float dur = id(media_duur).state;
            if (isnan(pos) || isnan(dur) || dur <= 0) return 0;
            return (int)std::min((pos / dur) * 100.0f, 100.0f);
      - lvgl.label.update:
          id: lbl_elapsed
          text: !lambda |-
            float pos = id(media_positie).state;
            if (isnan(pos)) return std::string("0:00");
            int m = (int)pos / 60;
            int s = (int)pos % 60;
            char buf[8];
            snprintf(buf, sizeof(buf), "%d:%02d", m, s);
            return std::string(buf);
      - lvgl.label.update:
          id: lbl_remaining
          text: !lambda |-
            float pos = id(media_positie).state;
            float dur = id(media_duur).state;
            if (isnan(pos) || isnan(dur)) return std::string("0:00");
            float rem = dur - pos;
            if (rem < 0) rem = 0;
            int m = (int)rem / 60;
            int s = (int)rem % 60;
            char buf[8];
            snprintf(buf, sizeof(buf), "-%d:%02d", m, s);
            return std::string(buf);
      - lvgl.slider.update:
          id: slider_volume
          value: !lambda |-
            float v = id(media_volume).state;
            if (isnan(v)) return 50;
            return (int)(v * 100.0f);
      - lvgl.label.update:
          id: lbl_play_icoon
          text: !lambda |-
            return id(media_state).state == "playing"
              ? std::string("||") : std::string("> ");
```

- [ ] **Stap 4: Flash en controleer media-scherm**

---

## Wat bewust NIET geïmplementeerd is

| Feature | Reden |
|---------|-------|
| Water ring | Geen watermeter-sensor in HA |
| Solar kWh vandaag | Geen dagelijkse sensor beschikbaar |
| Nordpool dynamische prijs | Niet geconfigureerd in HA |
| Daily import/export kWh | Geen utility meter in HA |
| Album art via online_image | Broken in ESPHome 2026.5.x |
| Swipe tussen pagina's | Optioneel per README — nav knoppen zijn voldoende |
| Klimaat/Camera/Weer schermen | Bewust uitgesloten door gebruiker |
| Font letter-spacing | Niet ondersteund in LVGL |
| Gradient tile achtergrond | Niet ondersteund in LVGL — solide kleur als vervanger |
