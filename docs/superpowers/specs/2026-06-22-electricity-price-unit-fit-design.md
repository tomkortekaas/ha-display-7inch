# Stroomprijs-eenheid passend maken

## Doel

Zorg dat de volledige stroomprijs inclusief `kWh` binnen de rechter energiekaart past, zonder een decimaal van de prijs te verwijderen.

## Ontwerp

- Behoud de actuele prijs met drie decimalen: `€ 0,057`.
- Toon `/kWh` als een afzonderlijk, kleiner label direct rechts van de prijs.
- Behoud de gele kleur en de bestaande balk.
- Gebruik voor de prijs `font_roboto_36` en voor de eenheid `font_roboto_16`.
- Plaats beide labels in één horizontale container van 244 px breed, zodat de combinatie gecentreerd blijft en niet wordt afgeknipt.
- Toon bij een onbeschikbare sensor `--` als prijs; `/kWh` blijft zichtbaar.

## Afbakening

De sensor, precisie, prijsbalk, overige metrics en schermindeling blijven ongewijzigd.

## Verificatie

- Structurele controle op twee afzonderlijke labels.
- Volledige ESPHome-configuratie valideren en compileren.
- Firmware via OTA uploaden en controleren dat het display weer online komt.
