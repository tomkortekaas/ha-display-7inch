# Bouwprompt: Balans-energiepagina voor het 7-inch display

Werk in deze repository:

`/Users/tomkortekaas/Documents/AI APP/ha_display_7inch`

Implementeer het goedgekeurde Balans-energiescherm in:

`esphome/ha-display-7.yaml`

Lees eerst volledig:

1. `docs/superpowers/specs/2026-06-22-balans-energie-screen-design.md`
2. `docs/superpowers/plans/2026-06-22-balans-energie-screen.md`
3. `/Users/tomkortekaas/.agents/skills/esphome-lvgl/SKILL.md`

## Opdracht

Vervang uitsluitend de huidige `page_energy` en de bijbehorende energiebindings- en updatecode door een 2×2 live stroomoverzicht:

- linksboven: zonnepanelen;
- rechtsboven: netaansluiting;
- linksonder: huis;
- rechtsonder: batterij;
- centraal: BALANS-omvormer.

Gebruik ronde meters in HomeWizard-stijl, maar behoud exact de Montserrat-typografie, kleuren en visuele gewichten van het bestaande 7-inch dashboard.

Maak vier afgeronde, volledig gescheiden stroomroutes. Iedere route krijgt een eigen aansluitpunt op het BALANS-blok. Geen route mag een andere kruisen of overlappen. Toon een bewegende ronde stip per actieve route; de stiprichting volgt de echte energierichting.

## Databronnen

Gebruik exact:

- PV: `sensor.electricity_meter_energieproductie`
- net: `sensor.balans_batterij_grid_power`
- huis: `sensor.balans_batterij_load_power`
- batterijvermogen: `sensor.balans_batterij_vermogen`
- batterij-SOC: `sensor.balans_batterij_soc`
- batterijstatus: `sensor.balans_batterij_status`
- batterijtemperatuur: `sensor.balans_batterij_battery_temperature`
- omvormerstatus: `sensor.balans_batterij_device_state`
- verbinding: `binary_sensor.balans_batterij_connection`
- prijs: `sensor.stroomprijs_huidige_prijs`
- kosten vandaag: `sensor.kosten_stroom_vandaag`
- maandkosten: `sensor.kosten_stroom_deze_maand`
- gas: `sensor.gasverbruik_nu`

Er bestaat geen PV-bron aan de Balans-omvormer. Toon nergens `PV aan Balans omvormer` en maak geen tweede PV-meter.

## Gedrag

- Nulband: ±50 W.
- Binnen nulband: grijze route, geen bewegende stip.
- Net:
  - positief = `IMPORT`;
  - negatief = `EXPORT`;
  - nulband = `NET ROND 0`.
- Huis:
  - positief = `VERBRUIK`;
  - negatief = `HUIS NAAR BALANS`;
  - nulband = `GEEN VERBRUIK`.
- Batterij:
  - `charging` = `LADEN`;
  - `discharging` = `ONTLADEN`;
  - `idle` = `STAND-BY`.
- Toon absolute vermogenswaarden:
  - onder 1000 W als gehele watts;
  - vanaf 1000 W als kW met één decimaal.
- Toon `--` voor ontbrekende waarden.

## Visuele eisen

- Bestaand inhoudsgebied: `936×544` vanaf `x: 88`, `y: 56`.
- Achtergrond `0x000000`; panelen `0x101010`.
- PV/huis `0x2EE36A`.
- Net `0x2F9BFF`.
- Batterij `0xFFAD3B`.
- Prijs `0xFFD84A`.
- Gas `0xFF2A7A`.
- Temperatuur `0xFF8A3A`.
- Cirkels exact `128×128`.
- Ringdikte 11–12 px.
- Routelijnen 4 px met ronde uiteinden/hoeken.
- Hoofdwaarden `font_roboto_28`.
- Labels buiten de cirkel; binnenin alleen pictogram, waarde, korte status en bij batterij SOC.

## Technische eisen

- Gebruik uitsluitend LVGL-native widgets.
- Gebruik één 2-secondeninterval voor waarden en styling.
- Gebruik een kort apart interval voor flowdot-animatie.
- Gebruik geen `on_value` voor LVGL-redraws.
- Behoud alle overige pagina’s, navigatie, statusbalk, hardwareconfiguratie en bestaande gebruikerswijzigingen.
- Gebruik geen schrijfbare Solarman-entiteiten.
- Controleer vóór wijzigen `git status` en behoud niet-gerelateerde wijzigingen.

## Verificatie

Voer minimaal uit:

```bash
git diff --check -- esphome/ha-display-7.yaml
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome config esphome/ha-display-7.yaml
```

Compileer daarna vanuit een tijdelijk pad zonder spaties:

```bash
rm -rf /tmp/ha_display_balans_build
mkdir -p /tmp/ha_display_balans_build
cp esphome/ha-display-7.yaml esphome/secrets.yaml /tmp/ha_display_balans_build/
cd /tmp/ha_display_balans_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome compile ha-display-7.yaml
```

Claim pas voltooiing wanneer configvalidatie en compile exit code `0` geven. Rapporteer gewijzigde bestanden, verificatie-uitvoer en eventuele resterende fysieke-display-QA.
