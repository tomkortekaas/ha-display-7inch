# Stabiliteit afbeeldingsloads 7-inch display

## Doel

Voorkom dat het 7-inch ESPHome/LVGL-display secondenlang niet reageert door onzichtbare of herhaalde afbeeldingsdownloads. Immich en AH-receptafbeeldingen blijven beschikbaar, maar veroorzaken alleen belasting wanneer hun pagina zichtbaar is.

## Vastgestelde oorzaak

Live ESPHome-logs tonen dat een Immich-download de hoofdloop 23–37 seconden kan bezighouden. Een mislukte download start opnieuw. Bij een API-herverbinding bieden de 24 Home Assistant-receptsensoren hun waarden opnieuw aan, waarna alle thumbnails opnieuw worden gedownload. Individuele thumbnailacties blokkeren tot circa 3,7 seconden. Tijdens deze belasting verbreekt de ESPHome-API soms de verbinding.

## Gekozen aanpak

### Immich

- Een wijziging van `sensor.immich_photo_url` bewaart alleen de gewenste URL.
- Download de foto uitsluitend wanneer de Immich-pagina zichtbaar is.
- Bij het openen van de pagina wordt de nieuwste nog niet geladen URL opgehaald.
- Bij het verlaten van de pagina worden wachtende retries geannuleerd of genegeerd.
- Een mislukte download krijgt maximaal één retry, zolang de pagina nog zichtbaar is.
- De rotatie in Home Assistant mag iedere minuut blijven publiceren.

### AH-recepten

- Voeg in de backend een echte `mode=thumb` toe die een afbeelding van 96×72 levert, in plaats van een grote render die op het display wordt verkleind.
- Cache thumbnails op recept-ID en afmetingen en stuur cachebare HTTP-headers mee.
- Het display onthoudt per slot de laatst geladen recept-ID of stabiele URL.
- Een Home Assistant/API-herverbinding zet alleen een download klaar als de inhoud van het slot werkelijk is veranderd.
- Thumbnails worden uitsluitend geladen wanneer de receptenlijst zichtbaar is.
- Downloads blijven serieel. De eerste zichtbare set krijgt voorrang; overige slots volgen met een korte adempauze zodat touch en API verwerkt kunnen worden.

### Algemene beveiliging

- De bestaande globale `artwork_busy`-vergrendeling blijft behouden.
- `api.reboot_timeout` wordt `0s`; verlies van de Home Assistant-API mag het display niet herstarten.
- Bestaande Spotify-, radar-, deurbel- en reviewfunctionaliteit verandert niet, behalve dat ze niet tegelijk met de aangepaste loads mogen starten.

## Datastroom

1. Home Assistant publiceert een nieuwe foto-URL of receptlijst.
2. ESPHome vergelijkt de stabiele identiteit met de laatst geladen identiteit.
3. Alleen de actieve pagina mag een nieuwe download aan de seriële wachtrij aanbieden.
4. Na succes wordt de geladen identiteit vastgelegd en het LVGL-image bijgewerkt.
5. Bij een fout wordt de lock vrijgegeven; alleen de zichtbare pagina mag eenmaal opnieuw proberen.

## Verificatie

- ESPHome-configuratie valideren en firmware compileren.
- Backendtests toevoegen voor `mode=thumb`, afmetingen en cacheheaders.
- Controleren dat een API-herverbinding met ongewijzigde recept-ID's geen nieuwe thumbnailgolf veroorzaakt.
- Controleren dat Immich buiten de fotopagina niet downloadt en bij openen wel de nieuwste foto toont.
- Na upload live logs volgen: geen lange onzichtbare afbeeldingsloads, geen API-disconnect en normale touchrespons tijdens zichtbare downloads.

## Buiten scope

- Geen visuele herinrichting van de pagina's.
- Geen algemene refactor van het grote ESPHome-bestand.
- Geen wijziging aan de inhoud of rotatieselectie van Immich.
