# Huidige stroomprijs op energiescherm

## Doel

Toon de actuele dynamische stroomprijs op het energiescherm zonder extra ruimte in te nemen.

## Ontwerp

- Gebruik Home Assistant-entiteit `sensor.stroomprijs_huidige_prijs`.
- Vervang in de rechterkolom de dubbele metric `VERBRUIK NU` door `STROOMPRIJS`.
- Toon de waarde als `€ 0,040/kWh`, met drie decimalen.
- Gebruik de bestaande gele kostenkleur voor de prijs.
- Gebruik de bestaande balk als indicatie op een schaal van €0,00 tot €0,50 per kWh.
- Klem negatieve prijzen visueel af op 0% en prijzen vanaf €0,50 op 100%; de tekst toont altijd de werkelijke waarde.
- Toon `-- €/kWh` wanneer de sensor niet beschikbaar is.

## Datastroom

ESPHome importeert de prijs als interne Home Assistant-sensor. De bestaande periodieke LVGL-update leest de sensor en werkt het label en de balk bij.

## Afbakening

Alle overige metrics, indeling en navigatie blijven ongewijzigd.

## Verificatie

- Controleer dat de oude rechterkolom-ID's voor `VERBRUIK NU` niet meer worden bijgewerkt.
- Valideer en compileer de volledige ESPHome-configuratie.
- Upload de gebouwde firmware via OTA naar het bestaande display.
