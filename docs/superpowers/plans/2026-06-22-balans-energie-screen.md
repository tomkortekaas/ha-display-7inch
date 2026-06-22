# Balans Energy Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de huidige 7-inch Energiepagina door het goedgekeurde 2×2 Balans-stroomoverzicht met ronde meters, gescheiden afgeronde routes en live batterijdata.

**Architecture:** Alle data blijft in Home Assistant en wordt read-only gespiegeld naar ESPHome. Eén LVGL-pagina bevat vier ronde meters, een centraal BALANS-blok, vier gescheiden routes en vier onderkaarten. Eén 2-secondeninterval werkt waarden en statussen bij; één kort animatie-interval verplaatst alleen de vier stroomstippen.

**Tech Stack:** ESPHome 2026.3+, ESP32-P4, LVGL, Home Assistant native API, YAML, C++ lambdas.

## Global Constraints

- Werk uitsluitend in `esphome/ha-display-7.yaml`.
- Behoud alle niet-energiepagina’s, navigatie, statusbalk, hardwareconfiguratie en lokale gebruikerswijzigingen.
- Inhoudsgebied: `x: 88`, `y: 56`, `936×544`.
- Gebruik bestaande Montserrat-font-ID’s en de bestaande kleuren.
- PV komt uitsluitend van `sensor.electricity_meter_energieproductie`.
- Gebruik geen schrijfbare Solarman-entiteiten of bedieningsknoppen.
- Vermogensnulband: `-50 W` tot `+50 W`.
- Alle LVGL-data-updates lopen via `interval`, niet via `on_value`.
- De vier routes kruisen of overlappen niet.
- Validatie en volledige compile moeten slagen vóór upload.

---

## File Structure

- Modify: `esphome/ha-display-7.yaml`
  - Home Assistant sensorbindings voor Balans.
  - Globale animatiefase.
  - Volledige vervanging van `page_energy`.
  - Centrale update- en animatielogica.
- Reference: `docs/superpowers/specs/2026-06-22-balans-energie-screen-design.md`
  - Goedgekeurde requirements en datalogica.

### Task 1: Voeg het Balans-datacontract toe

**Files:**
- Modify: `esphome/ha-display-7.yaml` bij `globals:`, `sensor:`, `text_sensor:` en `binary_sensor:`

**Interfaces:**
- Produces numeric IDs: `ha_balans_grid_power`, `ha_balans_load_power`, `ha_balans_battery_power`, `ha_balans_soc`, `ha_balans_battery_temp`
- Produces text IDs: `ha_balans_battery_state`, `ha_balans_device_state`
- Produces binary ID: `ha_balans_connection`
- Produces animation state: `energy_flow_phase`

- [ ] **Step 1: Leg de verwachte nieuwe bindings vast met een falende statische test**

Run:

```bash
for id in \
  ha_balans_grid_power ha_balans_load_power ha_balans_battery_power \
  ha_balans_soc ha_balans_battery_temp ha_balans_battery_state \
  ha_balans_device_state ha_balans_connection energy_flow_phase
do
  rg -q "id: ${id}" esphome/ha-display-7.yaml || echo "MISSING ${id}"
done
```

Expected before implementation: alle negen IDs worden als `MISSING` gemeld.

- [ ] **Step 2: Voeg de globale animatiefase toe**

Voeg onder `globals:` toe:

```yaml
  - id: energy_flow_phase
    type: int
    restore_value: no
    initial_value: '0'
```

- [ ] **Step 3: Voeg numerieke Home Assistant-sensoren toe**

Voeg onder de bestaande energie-sensoren toe:

```yaml
  - platform: homeassistant
    id: ha_balans_grid_power
    entity_id: sensor.balans_batterij_grid_power
    internal: true
  - platform: homeassistant
    id: ha_balans_load_power
    entity_id: sensor.balans_batterij_load_power
    internal: true
  - platform: homeassistant
    id: ha_balans_battery_power
    entity_id: sensor.balans_batterij_vermogen
    internal: true
  - platform: homeassistant
    id: ha_balans_soc
    entity_id: sensor.balans_batterij_soc
    internal: true
  - platform: homeassistant
    id: ha_balans_battery_temp
    entity_id: sensor.balans_batterij_battery_temperature
    internal: true
```

- [ ] **Step 4: Voeg tekst- en verbindingssensoren toe**

Voeg onder `text_sensor:` toe:

```yaml
  - platform: homeassistant
    id: ha_balans_battery_state
    entity_id: sensor.balans_batterij_status
    internal: true
  - platform: homeassistant
    id: ha_balans_device_state
    entity_id: sensor.balans_batterij_device_state
    internal: true
```

Voeg onder `binary_sensor:` toe:

```yaml
  - platform: homeassistant
    id: ha_balans_connection
    entity_id: binary_sensor.balans_batterij_connection
    internal: true
```

- [ ] **Step 5: Herhaal de statische test**

Run hetzelfde commando uit Step 1.

Expected: geen uitvoer, exit code `0`.

- [ ] **Step 6: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: add Balans energy sensor bindings"
```

### Task 2: Bouw de nieuwe statische Energiepagina

**Files:**
- Modify: `esphome/ha-display-7.yaml`, volledige widgetinhoud van `page_energy`

**Interfaces:**
- Consumes: alle IDs uit Task 1
- Produces labels: `lbl_energy_connection`, `lbl_energy_core_state`, `lbl_energy_pv_value`, `lbl_energy_grid_value`, `lbl_energy_grid_state`, `lbl_energy_house_value`, `lbl_energy_house_state`, `lbl_energy_battery_value`, `lbl_energy_battery_state`, `lbl_energy_battery_soc`, `lbl_energy_price`, `lbl_energy_cost_today`, `lbl_energy_cost_month`, `lbl_energy_gas`, `lbl_energy_battery_temp`
- Produces arcs: `arc_energy_pv`, `arc_energy_grid`, `arc_energy_house`, `arc_energy_battery`
- Produces routes: `route_pv_h`, `route_pv_curve`, `route_pv_v`, `route_grid_h`, `route_grid_curve`, `route_grid_v`, `route_house_h`, `route_house_curve`, `route_house_v`, `route_battery_h`, `route_battery_curve`, `route_battery_v`
- Produces flow dots: `dot_energy_pv`, `dot_energy_grid`, `dot_energy_house`, `dot_energy_battery`

- [ ] **Step 1: Maak een falende widget-contracttest**

```bash
for id in \
  lbl_energy_connection lbl_energy_core_state \
  arc_energy_pv arc_energy_grid arc_energy_house arc_energy_battery \
  route_pv_curve route_grid_curve route_house_curve route_battery_curve \
  dot_energy_pv dot_energy_grid dot_energy_house dot_energy_battery
do
  rg -q "id: ${id}" esphome/ha-display-7.yaml || echo "MISSING ${id}"
done
```

Expected before replacement: alle IDs worden gemeld.

- [ ] **Step 2: Vervang alleen `page_energy`**

Gebruik deze exacte hoofdgeometrie:

```yaml
    - id: page_energy
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
            pad_all: 0
            scrollable: false
            widgets:
              - label:
                  x: 22
                  y: 12
                  text: "Live energiestroom"
                  text_font: font_roboto_20
                  text_color: 0xFFFFFF
              - label:
                  id: lbl_energy_connection
                  x: 650
                  y: 16
                  width: 258
                  text_align: RIGHT
                  text: "● VERBONDEN"
                  text_font: font_roboto_12
                  text_color: 0x2EE36A
              - obj:
                  id: energy_flow_canvas
                  x: 22
                  y: 48
                  width: 892
                  height: 400
                  radius: 18
                  bg_color: 0x101010
                  bg_opa: COVER
                  border_width: 0
                  pad_all: 0
                  scrollable: false
```

Plaats binnen `energy_flow_canvas`:

- PV-node linksboven: cirkel `128×128`, centrum `(225, 105)`.
- Net-node rechtsboven: cirkel `128×128`, centrum `(667, 105)`.
- Huis-node linksonder: cirkel `128×128`, centrum `(225, 295)`.
- Batterij-node rechtsonder: cirkel `128×128`, centrum `(667, 295)`.
- BALANS-blok centraal: `154×92`, centrum `(446, 200)`.
- Bronnamen buiten de cirkels.
- Binnen iedere cirkel alleen pictogram, waarde en korte status; batterij krijgt daarnaast SOC.

Gebruik voor iedere ronde meter een LVGL `arc`:

```yaml
              - arc:
                  id: arc_energy_pv
                  x: 161
                  y: 41
                  width: 128
                  height: 128
                  start_angle: 135
                  end_angle: 45
                  min_value: 0
                  max_value: 100
                  value: 0
                  adjustable: false
                  arc_color: 0x1A1A1A
                  arc_width: 11
                  indicator:
                    arc_color: 0x2EE36A
                    arc_width: 11
```

Herhaal hetzelfde patroon voor net (`0x2F9BFF`), huis (`0x2EE36A`) en batterij (`0xFFAD3B`). Geef iedere meter de IDs uit het interfaceblok.

- [ ] **Step 3: Bouw vier gescheiden afgeronde routes**

Elke route bestaat uit twee dunne `obj`-segmenten en één niet-aanpasbare `arc` van 32–48 px als bocht. Geef de bochten respectievelijk de IDs `route_pv_curve`, `route_grid_curve`, `route_house_curve` en `route_battery_curve`. Gebruik voor elk pad een afzonderlijke bounding box. Houd minimaal 18 px verticale afstand tussen boven- en onderroutes.

Vereiste aansluitingen:

- PV → linkerbovenpoort BALANS
- net → rechterbovenpoort BALANS
- huis ↔ linkeronderpoort BALANS
- batterij ↔ rechteronderpoort BALANS

Gebruik de route-ID’s uit het interfaceblok en `radius: 2` voor rechte segmenten. Voeg per route één ronde `obj` van `10×10`, `radius: 5` toe als flowdot.

- [ ] **Step 4: Bouw de vier onderkaarten**

Gebruik vier kaarten op `y: 460`, hoogte `70`, met deze exacte x/width-paren:

- kaart 1: `x: 0`, `width: 215`
- kaart 2: `x: 225`, `width: 216`
- kaart 3: `x: 451`, `width: 215`
- kaart 4: `x: 676`, `width: 216`

- stroomprijs: `lbl_energy_price`
- kosten vandaag + maand: `lbl_energy_cost_today`, `lbl_energy_cost_month`
- gas: `lbl_energy_gas`
- batterijtemperatuur: `lbl_energy_battery_temp`

Gebruik `0x101010`, `radius: 14`, geen border.

- [ ] **Step 5: Controleer de widgetcontracttest**

Run hetzelfde commando uit Step 1.

Expected: geen `MISSING`-regels.

- [ ] **Step 6: Controleer dat oude Energie-widgets niet meer worden gedefinieerd**

```bash
for id in arc_verbruik arc_solar arc_gas bar_kosten bar_productie bar_temp; do
  count=$(rg -c "id: ${id}$" esphome/ha-display-7.yaml || true)
  test "$count" = "0" || { echo "OLD_WIDGET ${id} count=${count}"; exit 1; }
done
```

Expected: geen uitvoer.

- [ ] **Step 7: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: replace energy page with Balans flow layout"
```

### Task 3: Implementeer waarden, statussen en stroomanimatie

**Files:**
- Modify: `esphome/ha-display-7.yaml`, bestaande `interval:`-sectie

**Interfaces:**
- Consumes: sensor- en widget-ID’s uit Tasks 1–2
- Produces: 2-seconden data-update en 250-ms animatie-update

- [ ] **Step 1: Verwijder alle updates naar oude Energie-widget-ID’s**

```bash
for id in arc_verbruik arc_solar arc_gas lbl_verbruik_w lbl_solar_w lbl_gas_mh \
  lbl_verbruik_kw lbl_productie_kw lbl_kosten_vandaag lbl_kosten_maand \
  lbl_cost_groot bar_kosten lbl_prod_rechts bar_productie lbl_binnen_temp bar_temp
do
  rg -n "id: ${id}$" esphome/ha-display-7.yaml && echo "STALE ${id}"
done
```

Expected na verwijdering: geen uitvoer.

- [ ] **Step 2: Voeg één 2-secondenupdate toe**

Gebruik één `lambda` voor formattering en statuskeuze:

```yaml
  - interval: 2s
    then:
      - lambda: |-
          auto valid_text = [](const std::string &s) {
            return !s.empty() && s != "unknown" && s != "unavailable" && s != "None";
          };
          auto power_text = [](float watts) -> std::string {
            if (isnan(watts)) return "--";
            watts = fabsf(watts);
            char buf[16];
            if (watts < 1000.0f) snprintf(buf, sizeof(buf), "%.0f W", watts);
            else snprintf(buf, sizeof(buf), "%.1f kW", watts / 1000.0f);
            return std::string(buf);
          };
          auto set_route = [](lv_obj_t *h, lv_obj_t *curve, lv_obj_t *v, lv_color_t color, bool active) {
            lv_color_t route_color = active ? color : lv_color_hex(0x303030);
            lv_obj_set_style_bg_color(h, route_color, LV_PART_MAIN);
            lv_obj_set_style_arc_color(curve, route_color, LV_PART_MAIN);
            lv_obj_set_style_bg_color(v, route_color, LV_PART_MAIN);
          };

          const float threshold = 50.0f;
          float pv_w = id(ha_productie).state * 1000.0f;
          float grid_w = id(ha_balans_grid_power).state;
          float house_w = id(ha_balans_load_power).state;
          float battery_w = id(ha_balans_battery_power).state;
          float soc = id(ha_balans_soc).state;

          lv_label_set_text(id(lbl_energy_pv_value), power_text(pv_w).c_str());
          lv_label_set_text(id(lbl_energy_grid_value), power_text(grid_w).c_str());
          lv_label_set_text(id(lbl_energy_house_value), power_text(house_w).c_str());
          lv_label_set_text(id(lbl_energy_battery_value), power_text(battery_w).c_str());

          lv_label_set_text(id(lbl_energy_grid_state),
            isnan(grid_w) ? "--" : grid_w > threshold ? "IMPORT" :
            grid_w < -threshold ? "EXPORT" : "NET ROND 0");
          lv_label_set_text(id(lbl_energy_house_state),
            isnan(house_w) ? "--" : house_w > threshold ? "VERBRUIK" :
            house_w < -threshold ? "HUIS NAAR BALANS" : "GEEN VERBRUIK");

          std::string battery_state = id(ha_balans_battery_state).state;
          lv_label_set_text(id(lbl_energy_battery_state),
            battery_state == "charging" ? "LADEN" :
            battery_state == "discharging" ? "ONTLADEN" :
            battery_state == "idle" ? "STAND-BY" : "--");

          char soc_buf[16];
          if (isnan(soc)) snprintf(soc_buf, sizeof(soc_buf), "-- SOC");
          else snprintf(soc_buf, sizeof(soc_buf), "%.0f%% SOC", soc);
          lv_label_set_text(id(lbl_energy_battery_soc), soc_buf);
          lv_arc_set_value(id(arc_energy_battery), isnan(soc) ? 0 : (int)std::clamp(soc, 0.0f, 100.0f));

          bool pv_active = !isnan(pv_w) && pv_w > threshold;
          bool grid_active = !isnan(grid_w) && fabsf(grid_w) > threshold;
          bool house_active = !isnan(house_w) && fabsf(house_w) > threshold;
          bool battery_active = !isnan(battery_w) && fabsf(battery_w) > threshold;
          set_route(id(route_pv_h), id(route_pv_curve), id(route_pv_v), lv_color_hex(0x2EE36A), pv_active);
          set_route(id(route_grid_h), id(route_grid_curve), id(route_grid_v), lv_color_hex(0x2F9BFF), grid_active);
          set_route(id(route_house_h), id(route_house_curve), id(route_house_v), lv_color_hex(0x2EE36A), house_active);
          set_route(id(route_battery_h), id(route_battery_curve), id(route_battery_v), lv_color_hex(0xFFAD3B), battery_active);

          if (pv_active) lv_obj_clear_flag(id(dot_energy_pv), LV_OBJ_FLAG_HIDDEN);
          else lv_obj_add_flag(id(dot_energy_pv), LV_OBJ_FLAG_HIDDEN);
          if (grid_active) lv_obj_clear_flag(id(dot_energy_grid), LV_OBJ_FLAG_HIDDEN);
          else lv_obj_add_flag(id(dot_energy_grid), LV_OBJ_FLAG_HIDDEN);
          if (house_active) lv_obj_clear_flag(id(dot_energy_house), LV_OBJ_FLAG_HIDDEN);
          else lv_obj_add_flag(id(dot_energy_house), LV_OBJ_FLAG_HIDDEN);
          if (battery_active) lv_obj_clear_flag(id(dot_energy_battery), LV_OBJ_FLAG_HIDDEN);
          else lv_obj_add_flag(id(dot_energy_battery), LV_OBJ_FLAG_HIDDEN);

          bool connected = id(ha_balans_connection).state;
          lv_label_set_text(id(lbl_energy_connection), connected ? "● VERBONDEN" : "● GEEN VERBINDING");
          lv_obj_set_style_text_color(id(lbl_energy_connection),
            lv_color_hex(connected ? 0x2EE36A : 0xFF2A7A), LV_PART_MAIN);

          std::string device_state = id(ha_balans_device_state).state;
          lv_label_set_text(id(lbl_energy_core_state),
            device_state == "Normal" ? "OMVORMER · ACTIEF" :
            valid_text(device_state) ? device_state.c_str() : "OMVORMER · ONBEKEND");

          float price = id(ha_stroomprijs).state;
          float today = id(ha_kosten_vandaag).state;
          float month = id(ha_kosten_maand).state;
          float gas = id(ha_gas).state;
          float temp = id(ha_balans_battery_temp).state;
          char buf[32];
          if (isnan(price)) lv_label_set_text(id(lbl_energy_price), "--");
          else { snprintf(buf, sizeof(buf), "\xe2\x82\xac %.3f/kWh", price); lv_label_set_text(id(lbl_energy_price), buf); }
          if (isnan(today)) lv_label_set_text(id(lbl_energy_cost_today), "--");
          else { snprintf(buf, sizeof(buf), "\xe2\x82\xac %.2f", today); lv_label_set_text(id(lbl_energy_cost_today), buf); }
          if (isnan(month)) lv_label_set_text(id(lbl_energy_cost_month), "MAAND --");
          else { snprintf(buf, sizeof(buf), "MAAND \xe2\x82\xac %.2f", month); lv_label_set_text(id(lbl_energy_cost_month), buf); }
          if (isnan(gas)) lv_label_set_text(id(lbl_energy_gas), "--");
          else { snprintf(buf, sizeof(buf), "%.3f m3/u", gas); lv_label_set_text(id(lbl_energy_gas), buf); }
          if (isnan(temp)) lv_label_set_text(id(lbl_energy_battery_temp), "--");
          else { snprintf(buf, sizeof(buf), "%.1f\xc2\xb0" "C", temp); lv_label_set_text(id(lbl_energy_battery_temp), buf); }
```

- [ ] **Step 3: Voeg de 250-ms flowdot-animatie toe**

Gebruik per route een tabel van punten die exact op de getekende route ligt. Keer de index om voor tegengestelde stroomrichting:

```yaml
  - interval: 250ms
    then:
      - lambda: |-
          id(energy_flow_phase) = (id(energy_flow_phase) + 1) % 8;
          int p = id(energy_flow_phase);
          auto place = [](lv_obj_t *dot, const int pts[8][2], int index) {
            lv_obj_set_pos(dot, pts[index][0], pts[index][1]);
          };
          static const int pv_pts[8][2] = {
            {214,124},{232,134},{254,145},{278,153},{305,160},{330,166},{350,170},{365,173}
          };
          static const int grid_pts[8][2] = {
            {670,124},{652,134},{630,145},{606,153},{579,160},{554,166},{534,170},{519,173}
          };
          static const int house_pts[8][2] = {
            {214,260},{232,250},{254,239},{278,231},{305,224},{330,218},{350,214},{365,211}
          };
          static const int battery_pts[8][2] = {
            {670,260},{652,250},{630,239},{606,231},{579,224},{554,218},{534,214},{519,211}
          };

          float grid_w = id(ha_balans_grid_power).state;
          float house_w = id(ha_balans_load_power).state;
          std::string battery_state = id(ha_balans_battery_state).state;
          place(id(dot_energy_pv), pv_pts, p);
          place(id(dot_energy_grid), grid_pts, grid_w > 50.0f ? 7 - p : p);
          place(id(dot_energy_house), house_pts, house_w > 50.0f ? 7 - p : p);
          place(id(dot_energy_battery), battery_pts, battery_state == "charging" ? 7 - p : p);
```

Gebruik deze puntcoördinaten ongewijzigd; teken de LVGL-routes door dezelfde punten zodat stip en route exact samenvallen.

- [ ] **Step 4: Valideer nulband en richting statisch**

```bash
rg -n 'threshold = 50.0f|grid_w > threshold|grid_w < -threshold|battery_state == "charging"|interval: 250ms' esphome/ha-display-7.yaml
```

Expected: alle vijf patronen aanwezig.

- [ ] **Step 5: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: animate Balans energy flows"
```

### Task 4: Valideer, compileer en controleer op regressies

**Files:**
- Verify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: volledige implementatie uit Tasks 1–3
- Produces: compileerbare firmware en een visueel gecontroleerd energiescherm

- [ ] **Step 1: Controleer YAML-diff en oude verwijzingen**

```bash
git diff --check -- esphome/ha-display-7.yaml
rg -n 'arc_verbruik|arc_solar|arc_gas|bar_kosten|bar_productie|bar_temp' esphome/ha-display-7.yaml
```

Expected:

- `git diff --check` exit code `0`;
- `rg` vindt geen oude Energie-widget-ID’s.

- [ ] **Step 2: Controleer alle Balans-entiteiten in Home Assistant**

Lees deze states in één batch:

```text
sensor.balans_batterij_grid_power
sensor.balans_batterij_load_power
sensor.balans_batterij_vermogen
sensor.balans_batterij_soc
sensor.balans_batterij_battery_temperature
sensor.balans_batterij_status
sensor.balans_batterij_device_state
binary_sensor.balans_batterij_connection
sensor.electricity_meter_energieproductie
```

Expected: iedere entiteit bestaat; verbinding is `on`; numerieke entiteiten hebben een getal of tijdelijk `unknown`, maar geen ontbrekende entity-ID.

- [ ] **Step 3: Valideer de ESPHome-config**

```bash
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib \
  esphome config esphome/ha-display-7.yaml
```

Expected: exit code `0`, geen duplicate-ID of ontbrekende widget-ID.

- [ ] **Step 4: Compileer vanuit een pad zonder spaties**

```bash
rm -rf /tmp/ha_display_balans_build
mkdir -p /tmp/ha_display_balans_build
cp esphome/ha-display-7.yaml esphome/secrets.yaml /tmp/ha_display_balans_build/
cd /tmp/ha_display_balans_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib \
  esphome compile ha-display-7.yaml
```

Expected: `SUCCESS` en exit code `0`.

- [ ] **Step 5: Controleer de uiteindelijke wijzigingsscope**

```bash
git diff --stat HEAD~3..HEAD
git diff HEAD~3..HEAD -- esphome/ha-display-7.yaml | rg '^[-+].*(page_lights|page_media|page_weather|page_agenda|page_immich|page_recepten)'
```

Expected: alleen `esphome/ha-display-7.yaml` gewijzigd; tweede commando geeft geen inhoudelijke wijzigingen aan andere pagina’s.

- [ ] **Step 6: Upload en voer visuele QA uit**

Upload via netwerk:

```bash
cd /tmp/ha_display_balans_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib \
  esphome run ha-display-7.yaml --device 192.168.1.186
```

Controleer op het fysieke scherm:

- labels passen volledig;
- vier routes blijven gescheiden;
- routekleur en stip verdwijnen binnen ±50 W;
- netstip draait om bij import/export;
- batterijstip draait om bij laden/ontladen;
- SOC-ring volgt 0–100%;
- overige pagina’s en navigatie werken ongewijzigd.

- [ ] **Step 7: Eindcommit indien compile- of QA-correcties nodig waren**

```bash
git add esphome/ha-display-7.yaml
git commit -m "fix: finalize Balans energy screen"
```
