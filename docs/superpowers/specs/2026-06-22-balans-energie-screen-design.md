# Balans-energiepagina voor het 7-inch display

## Doel

Vervang de huidige `page_energy` door één rustiger live energieoverzicht dat:

- de centrale stroomvisualisatie van Balans Energie volgt;
- ronde meters gebruikt, geïnspireerd op HomeWizard;
- dezelfde Montserrat-typografie, kleuren en visuele gewichten gebruikt als de huidige 7-inch Energiepagina;
- de bestaande algemene energiewaarden behoudt;
- de lokaal uitgelezen Balans/Deye-batterij toont;
- geen niet-bestaande PV-bron aan de Balans-omvormer suggereert.

De bestaande navigatierail, statusbalk en overige pagina’s blijven ongewijzigd.

## Schermindeling

Het beschikbare inhoudsgebied blijft `936×544` op positie `x: 88`, `y: 56`.

### Bovenbalk

- Titel links: `Live energiestroom`
- Rechts: groene verbindingsindicator en tekst `VERBONDEN`
- De verbindingsindicator gebruikt `binary_sensor.balans_batterij_connection`
- Bij verbroken verbinding wordt de indicator rood en verschijnt `GEEN VERBINDING`

### Centraal stroomgebied

Vier ronde meters staan symmetrisch in een 2×2-opstelling:

- linksboven: `Zonnepanelen`
- rechtsboven: `Netaansluiting`
- linksonder: `Huis`
- rechtsonder: `Batterij`

In het midden staat een compact zwart blok:

- hoofdtekst `BALANS`
- subtekst `OMVORMER · ACTIEF`
- gebruik `sensor.balans_batterij_device_state` voor de omvormertoestand
- bij `Normal` verschijnt `OMVORMER · ACTIEF`
- bij een andere geldige toestand verschijnt de Nederlandse status
- bij ontbrekende data verschijnt `OMVORMER · ONBEKEND`

Iedere meter heeft een eigen afgeronde route naar een apart aansluitpunt op het centrale blok. Routes kruisen of overlappen elkaar niet.

### Onderbalk

Vier compacte kaarten behouden relevante informatie van de huidige pagina:

1. huidige stroomprijs;
2. kosten vandaag met maandkosten als subtekst;
3. actueel gasverbruik;
4. batterijtemperatuur en verbindingsstatus.

## Ronde meters

De cirkels zijn circa `128×128 px`.

Binnen iedere cirkel staan maximaal:

1. een klein pictogram;
2. één grote hoofdwaarde;
3. één korte status;
4. alleen bij de batterij een extra compacte SOC-regel.

Lange namen staan buiten de cirkels. Hierdoor blijven waarden leesbaar en ontstaat geen tekstoverlap.

### Zonnepanelen

- Buitenlabel: `ZONNEPANELEN`
- Hoofdwaarde: actuele productie van de losse PV-omvormer
- Status: `PV`
- Bron: bestaande `sensor.electricity_meter_energieproductie`
- Deze bron vervangt visueel en functioneel `PV aan Balans omvormer`
- Er wordt nergens een tweede PV-bron weergegeven

### Netaansluiting

- Buitenlabel: `NETAANSLUITING`
- Bron: `sensor.balans_batterij_grid_power`
- Positief vermogen: `IMPORT`
- Negatief vermogen: `EXPORT`
- Rond nul: `NET ROND 0`
- De hoofdwaarde toont de absolute waarde; de status draagt de richting

### Huis

- Buitenlabel: `HUIS`
- Bron: `sensor.balans_batterij_load_power`
- Positief vermogen: `VERBRUIK`
- Negatief vermogen: `HUIS NAAR BALANS`
- Rond nul: `GEEN VERBRUIK`
- De hoofdwaarde toont de absolute waarde

### Batterij

- Buitenlabel: `BATTERIJ`
- Vermogen: `sensor.balans_batterij_vermogen`
- SOC: `sensor.balans_batterij_soc`
- Status: `sensor.balans_batterij_status`
- Statusvertaling:
  - `charging` → `LADEN`
  - `discharging` → `ONTLADEN`
  - `idle` → `STAND-BY`
- De ringvulling visualiseert SOC van 0–100%
- De hoofdwaarde toont absoluut batterijvermogen

## Overige databronnen

Behoud de bestaande Home Assistant-bronnen:

- `sensor.stroomprijs_huidige_prijs`
- `sensor.kosten_stroom_vandaag`
- `sensor.kosten_stroom_deze_maand`
- `sensor.gasverbruik_nu`

Voeg toe:

- `sensor.balans_batterij_battery_temperature`
- `binary_sensor.balans_batterij_connection`
- `sensor.balans_batterij_device_state`
- `sensor.balans_batterij_grid_power`
- `sensor.balans_batterij_load_power`
- `sensor.balans_batterij_soc`
- `sensor.balans_batterij_vermogen`
- `sensor.balans_batterij_status`

## Typografie en kleuren

Gebruik uitsluitend de reeds gedefinieerde Montserrat-fonts:

- labels: `font_roboto_12` of `font_roboto_16`, gewicht 600;
- statussen: compact, gewicht 700;
- hoofdwaarden: `font_roboto_28`, gewicht 800;
- centrale titel: `font_roboto_28`, gewicht 800;
- onderkaarten: `font_roboto_16` en `font_roboto_20`.

Kleuren sluiten aan op de huidige Energiepagina:

- achtergrond: `0x000000`;
- kaarten/stroomgebied: `0x101010`;
- secundaire tekst: `0xA0A0A0`;
- PV en huis: `0x2EE36A`;
- net: `0x2F9BFF`;
- batterij: `0xFFAD3B`;
- stroomprijs: `0xFFD84A`;
- gas: `0xFF2A7A`;
- temperatuur: `0xFF8A3A`;
- inactieve ring/route: `0x1A1A1A` of `0x303030`.

Ringen zijn ongeveer 11–12 px dik. Stroomroutes zijn 4 px dik met ronde uiteinden.

## Afgeronde routes en animatie

Gebruik LVGL-native objecten. Vermijd afhankelijkheid van HTML/SVG of zware custom rendering.

Elke route bestaat uit:

- korte horizontale/verticale lijnsegmenten;
- kwartcirkel-arcs voor afgeronde hoeken;
- een eigen gekleurde stip die langs die specifieke route beweegt.

De vier routes hebben volledig gescheiden geometrie en eigen aansluitpunten op het BALANS-blok.

### Stroomrichting

Gebruik een drempel van `±50 W`:

- waarden binnen deze band leveren een grijze, stilstaande route;
- buiten deze band krijgt de route de bronkleur en beweegt de stip;
- de bewegingsrichting volgt import/export, laden/ontladen en productie/verbruik;
- PV stroomt van de PV-meter naar het centrale systeem;
- batterij stroomt naar het centrum bij ontladen en omgekeerd bij laden;
- net stroomt naar het centrum bij import en van het centrum af bij export;
- huis stroomt vanuit het centrum naar het huis bij verbruik en omgekeerd bij `HUIS NAAR BALANS`.

Animeer met een korte interval en een gedeelde fasewaarde. Werk alleen widgetposities en zichtbaarheid bij; bouw de widgets niet opnieuw op.

## Updates en foutafhandeling

- Lees HA-sensoren als `internal: true`.
- Werk LVGL-widgets bij via één centrale `interval`, bij voorkeur iedere 2 seconden.
- Gebruik `isnan()` voor numerieke sensoren.
- Toon `--` bij ontbrekende waarden.
- Toon vermogen automatisch als gehele watts onder 1000 W en met één decimaal in kW vanaf 1000 W.
- Verberg bewegende stippen wanneer de bron niet beschikbaar of binnen de nulband is.
- Bij een ontbrekende Balans-verbinding blijven bestaande PV-, prijs-, kosten- en gaswaarden bruikbaar.

## Technische grenzen

- Wijzig alleen de energiegerelateerde sensoren, update-acties en `page_energy`.
- Behoud bestaande widget-ID’s alleen wanneer ze nog semantisch kloppen; verwijder geen ID die elders wordt gebruikt zonder alle verwijzingen mee te wijzigen.
- Laat navigatie, statusbalk, touchscreenconfiguratie, andere pagina’s en afbeeldingscomponenten intact.
- Gebruik `bg_opa: COVER`, `byte_order: little_endian` en de bestaande werkende displayconfiguratie.
- Voeg geen schrijfbare Solarman-entiteiten of bedieningsknoppen toe; dit scherm is uitsluitend uitlezend.

## Verificatie

Voor oplevering:

1. valideer de ESPHome-configuratie;
2. compileer de volledige YAML;
3. controleer dat alle gebruikte HA-entity-ID’s bestaan;
4. verifieer laden, ontladen, stand-by, netimport, netexport en nulband;
5. controleer dat labels en waarden binnen 1024×600 niet overlappen;
6. bevestig dat de overige pagina’s en navigatie niet gewijzigd zijn.
