# Agenda maximale-ruimtevariant — ontwerp

## Doel

Optimaliseer de huidige Focus + Sidebar-agenda voor grotere tekst en zo veel mogelijk ruimte voor afspraken.

## Indeling

- Het beschikbare agenda-canvas blijft `936×544` op `x:88, y:56`.
- De aparte topbar vervalt volledig.
- Klok, live-indicator en dynamisch datumbereik verdwijnen.
- `FAMILIE AGENDA` wordt als compact micro-label boven `Vandaag` in het linkerpaneel geplaatst.
- De tweekolomsindeling blijft behouden:
  - vandaag links, circa 500 px breed;
  - drie komende dagen rechts, circa 436 px breed.
- De panelen beginnen bovenaan en gebruiken vrijwel de volledige beschikbare hoogte.

## Vandaag

- Maximaal vijf afspraken.
- Titel van de afspraak: circa 16 px.
- Tijd: circa 13–14 px.
- Persoonschip: circa 11–12 px.
- Kaarten en tussenruimte worden zo verdeeld dat vijf afspraken plus de NU-indicator binnen de volledige hoogte passen.
- De NU-indicator blijft bestaan.
- Verstreken afspraken blijven gedimd.
- Bij meer dan vijf afspraken verschijnt `+N meer`.

## Komende dagen

- Dag 1, dag 2 en dag 3 krijgen ieder ongeveer een derde van de volledige hoogte.
- Iedere dag toont maximaal drie afspraken.
- De derde afspraak gebruikt dezelfde opmaak als de eerste twee.
- `+N meer` verschijnt pas bij vier of meer afspraken.
- Afspraaktitels worden circa 13–14 px.
- Tijden worden circa 12–13 px.
- Persoonslabels worden circa 11 px.
- Dagkoppen worden circa 14–16 px.
- Lege-dagtekst verschijnt alleen wanneer er geen afspraken zijn.

## Data en gedrag

- De bestaande sensoren `agenda_d0_*` tot en met `agenda_d3_*` blijven de databron.
- Voor komende dagen wordt ook `event_3` gelezen.
- Er komen geen nieuwe Home Assistant-entiteiten.
- De intervalgestuurde agenda-update blijft behouden.
- `+N meer` wordt voor vandaag berekend als totaal min vijf en voor komende dagen als totaal min drie.

## Verificatie en oplevering

- Structurele controle op drie toekomstige slots per dag.
- ESPHome-configvalidatie.
- Volledige firmwarecompile.
- USB-upload via `/dev/cu.usbmodem21201`.
- Opstartlog controleren op succesvolle boot en registratie van agendasensoren.
