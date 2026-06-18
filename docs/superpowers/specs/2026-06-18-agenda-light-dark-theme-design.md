# Licht/donker agendathema — ontwerp

## Doel

Voeg aan de bestaande agenda een lichte, rood-witte variant toe zonder de overige zwarte interface te wijzigen. Verwijder tegelijk de overbodige persoonschips bij de afspraken van vandaag.

## Themagedrag

- De huidige agenda blijft de donkere standaardvariant.
- Rechtsboven in het agenda-canvas komt een compacte schakelknop.
- In donker thema toont de knop `LICHT`; in licht thema toont de knop `DONKER`.
- Een tik wisselt direct tussen beide thema's.
- De gekozen variant wordt lokaal op het ESPHome-apparaat bewaard en na een herstart hersteld.
- Alleen het agenda-canvas en de widgets daarbinnen veranderen van kleur.
- De navigatierail, statusbalk en alle overige pagina's blijven zwart.

## Licht thema

De lichte variant is geïnspireerd op Apple Calendar en iOS, zonder het ontwerp letterlijk te kopiëren.

- Hoofdachtergrond: gebroken wit, circa `0xF5F5F7`.
- Vandaag-kaarten: wit, met een subtiele lichtgrijze rand.
- Primaire tekst: bijna zwart, circa `0x1C1C1E`.
- Secundaire tekst: middengrijs, circa `0x6E6E73`.
- Scheidingslijnen: lichtgrijs, circa `0xD7D7DC`.
- Hoofddaccent en themaknop: iOS-rood, circa `0xFF3B30`.
- Bestaande afspraakkleuren blijven beschikbaar voor de verticale accentlijnen, zodat agenda-afspraken herkenbaar blijven.
- De datumtegels van komende dagen worden wit met een lichtgrijze rand en rood datumcijfer.

## Donker thema

- De huidige donkere kleuren en kaartstyling blijven behouden.
- De themaknop krijgt een donkere achtergrond, subtiele rand en rood accent.
- De bestaande afspraakkleuren, verlopen-status en NU-indicator blijven functioneren.

## Vandaag

- De vijf `Familie`-chips en hun labels verdwijnen.
- De afspraakstitels gebruiken vrijwel de volledige resterende kaartbreedte.
- De bestaande kaartgrootte, tijden, accentlijnen, NU-indicator en maximaal vijf zichtbare afspraken blijven behouden.
- De update-lambda werkt niet langer persoonslabels of persoonschips bij.

## Komende dagen

- De drie afzonderlijke verticale scrollgebieden blijven behouden.
- Maximaal acht afspraken per dag blijven bereikbaar.
- Drie volledige tweeregelige items blijven bij de beginpositie zichtbaar.
- Het lichte thema past achtergrond-, tekst-, datumtegel-, scrollbar- en scheidingskleuren dynamisch aan.
- De vaste datumkoppen blijven tijdens scrollen op hun plaats.

## Implementatie

- Gebruik één bestaande widgetstructuur; maak geen dubbele lichte agenda-laag.
- Bewaar de themakeuze in een globale boolean met `restore_value: yes`.
- De schakelknop wijzigt de boolean en past direct alle relevante LVGL-stijlen toe.
- De intervalgestuurde agenda-update past de actieve themakleuren opnieuw toe, zodat dynamische widgets en afspraakaccenten correct blijven.
- De themaknop blijft boven de agenda-inhoud en neemt geen afspraakruimte in.

## Verificatie en oplevering

- Structurele controle op de herstelde thema-instelling en de knop.
- Controle dat Vandaag geen persoonschips of persoonslabels meer bevat.
- Controle dat Vandaag-titels de vrijgekomen breedte gebruiken.
- Controle op dynamische lichte en donkere kleuren voor canvas, kaarten, teksten, datumtegels en scheidingen.
- ESPHome-configuratie valideren en firmware volledig compileren.
- Firmware via USB uploaden.
- Opstartlog controleren op succesvolle boot, wifi en agenda-entiteiten.
- Op het fysieke scherm beide thema's en het bewaren na een herstart handmatig controleren.
