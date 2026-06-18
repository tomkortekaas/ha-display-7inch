# Scrollbare komende dagen — ontwerp

## Doel

Maak alle afspraken van de drie komende dagen bereikbaar zonder dat afspraken of titels half worden getoond.

## Indeling

- De bestaande verdeling met `Vandaag` links en drie komende dagen rechts blijft behouden.
- Iedere komende dag houdt een vaste datum- en dagkop.
- Onder iedere kop komt een afzonderlijk verticaal scrollgebied.
- Een veegbeweging binnen een dag scrolt alleen de afspraken van die dag.
- Een subtiele scrollbar geeft aan dat onderaan meer afspraken staan.

## Afspraken

- De bestaande acht `agenda_dN_event_1` tot en met `agenda_dN_event_8` sensoren worden gebruikt.
- Elk scrollgebied bevat maximaal acht afspraak-slots.
- Bij de beginpositie zijn drie volledige afspraken zichtbaar.
- Elk slot krijgt voldoende vaste hoogte voor een titel van maximaal twee volledige regels.
- Titels gebruiken wrapping en worden na maximaal twee regels afgekapt.
- Tijd blijft links staan, gevolgd door de gekleurde accentlijn.
- Het persoonslabel vervalt, omdat alle afspraken familieafspraken zijn.
- De volledige vrijgekomen rechterruimte wordt aan de titel gegeven.
- De bestaande `+N meer`-tekst vervalt, omdat alle afspraken rechtstreeks bereikbaar worden.

## Gedrag

- Lege dagen tonen `Geen afspraken` en zijn niet zinvol scrollbaar.
- Verborgen of ontbrekende afspraken nemen geen zichtbare ruimte in.
- De intervalgestuurde synchronisatie met Home Assistant blijft behouden.
- De datumkoppen blijven tijdens het scrollen op hun vaste positie staan.

## Verificatie en oplevering

- Structurele controle op acht slots en een verticaal scrollgebied per komende dag.
- Controle dat persoonslabels en `+N meer` voor komende dagen niet meer zichtbaar worden gebruikt.
- Controle dat titels twee regels ruimte en de volledige resterende breedte krijgen.
- ESPHome-configuratie valideren en firmware volledig compileren.
- Firmware via USB uploaden en de opstartlog controleren.
