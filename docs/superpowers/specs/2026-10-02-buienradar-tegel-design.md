# Buienradar als eigen tegel — design

## Doel

De Buienradar krijgt een eigen tegel op het tegelscherm en een eigen pagina. De
animatie moet vloeiend lopen zonder blauwe flitsen.

## Waarom de huidige aanpak niet goed is

- Elke 6 s wordt een los plaatje gedownload en gedecodeerd (9 per rondje), met
  hide/show eromheen. Het aantal laadbeurten is de gemeten oorzaak van flitsen
  (recepten, 2026-09-29), en 6 s per frame is geen animatie.
- Buienradar levert frames van **10 minuten**, niet 15. Het script pakt 9 van de
  12 frames met afronding, dus de sprongen zijn afwisselend 10 en 20 minuten en
  het label "+15 min per stap" klopt niet.
- De bron wordt op 268×402 opgevraagd en teruggeschaald naar 240×225; Buienradar
  levert tot 550×512.

## Keuzes

- **Bron**: Buienradar image-API, `sprite/RadarMapRainNL`, 550×512, `History=0`,
  `Forecast=12` → 12 frames van 10 min (nu t/m +110 min), Buienradar-kleuren
  ongewijzigd (variant 1). `renderText=False`: het label komt van het scherm.
- **Tijden**: de redirect-URL van Buienradar bevat het uitgiftetijdstip in UTC
  (`…/Sprite/202610020840__…`); frame 0 is dat tijdstip, elke volgende +10 min.
- **Eén verzamelplaatje**: HA zet de 12 frames onder elkaar in één JPEG van
  550×6144 (q88, 4:4:4, ~1 MB; de artwork-downloadgrens is 2 MB).
- **Animatie**: `lv_image_set_offset_y(img, -512 * frame)` op één widget van
  550×512. Geen download, decode of bufferwissel per frame.
- **Tempo**: 800 ms per frame, 2,5 s pauze op het eerste en laatste frame
  (rondje ≈ 13 s; 400 ms bleek te snel). Tik op de kaart = pauze/verder.
- **Laden**: alleen als de radarpagina open is én de versie veranderd is (of er
  nog niets geladen is). Software-decode (`hardware_acceleration: false`), achter
  `artwork_busy`. De decoder werkt in tijdsplakjes van 12 ms en schrijft in een
  aparte buffer, dus de oude kaart blijft lopen tot de nieuwe klaar is. Het
  buffer blijft na het verlaten van de pagina staan, zodat terugkomen direct is.
- **Geheugen**: 550×6144×2 = 6,8 MB PSRAM; tijdens het wisselen kortstondig het
  dubbele. Meten op het paneel.

## Home Assistant

- `buienradar_radar_7inch.py` haalt de sprite op, stapelt de frames verticaal en
  schrijft `/config/www/ha-display-radar/radar_sheet.jpg` atomair. Op stdout de
  laatste regel: `<epoch frame 0>|<aantal>|<stap in s>`, bv. `1791002400|12|600`.
  Bij een fout: exit 1 en het oude plaatje blijft staan (geen nep-stilstaande
  frames meer).
- De automation (elke 5 min + bij start) vangt die regel op met
  `response_variable` en zet hem in `input_text.ha_display_radar_meta`.
- De losse `radar_0..8.jpg` worden opgeruimd.

## Scherm

- **Tegelscherm 5×2**: tegels van 182×246 op x = 25, 223, 421, 619, 817.
  Volgorde: Energie, Lichten, Weer, Buienradar, Agenda / Foto's, Recepten,
  Timer, Muziek, (leeg). De tegel toont geen plaatje: waarde "Droog"/"Regen"
  uit de regenpunten, eronder het regenbijschrift.
- **Radarpagina** (`page_radar`, page_index 8), zwart, statusbalk als overlay:
  - kaart 550×512 op x 24, y 44;
  - rechterkolom vanaf x 606: "BUIENRADAR", grote klokttijd van het frame,
    relatief label ("nu", "+40 min"), de 12 regenbalken van de weerpagina
    (stilstaand, regen per 10 min) met begin- en eindtijd eronder,
    het regenbijschrift, en "bijgewerkt HH:MM" (amber + "verouderd" als de
    uitgifte ouder is dan 30 min).
  - Tijdens het eerste laden: "radar laden"; bij een fout na 2 pogingen:
    "radar offline" en de vorige kaart blijft staan.
- **Weerscherm**: de radarkaart verdwijnt. Op die plek komt een kaart zonder
  plaatje: "BUIENRADAR", het regenbijschrift en "Open radar ›"; tikken opent de
  radarpagina. Het weerscherm decodeert daarmee geen plaatjes meer.

## Testen

- `tests/check_radar_tile.sh`: tegel, pagina, offset-animatie, één artwork-bron
  van 550×6144 zonder hardware-decode, geen `radar_%d.jpg` meer.
- `tests/check_tile_home.sh` bijwerken naar 5×2.
- Python-script lokaal tegen de echte API (uitvoerpad via env-variabele).
- `esphome config` en compile; daarna op het paneel: decodetijd en geheugen uit
  de log, en lange frames tellen met de `on_refresh_done`-meting.
