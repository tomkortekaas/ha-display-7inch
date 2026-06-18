# Agenda Focus + Sidebar — ontwerp

## Doel

Vervang de huidige zevenkoloms weekagenda in `esphome/ha-display-7.yaml` door de gekozen high-fidelity variant **C — Focus + Sidebar** uit `design_handoff_agenda_weekview`.

De bestaande navigatierail blijft behouden. Alleen de agenda-inhoud en de bijbehorende LVGL-updatecode veranderen.

## Canvas en compositie

- Fysiek scherm: 1024×600.
- Bestaande navigatierail: 88 px breed.
- Agenda-canvas: `x: 88`, `y: 56`, `width: 936`, `height: 544`.
- Achtergrond: `0x08080A`; surfaces: `0x131418`; subtiele lijnen: circa 7% wit.
- Topbar binnen het agenda-canvas: circa 52 px hoog.
- Onder de topbar:
  - linkerpaneel Vandaag: circa 500 px breed;
  - rechterpaneel komende dagen: resterende circa 436 px;
  - verticale scheidingslijn tussen beide panelen.

De handoff van 800×480 wordt adaptief vertaald. De compositie, kleuren, typografische hiërarchie en componentvormen blijven trouw aan het prototype; de extra ruimte wordt gebruikt voor bredere kaarten en ruimere verticale plaatsing, niet voor een uniforme schaalvergroting.

## Topbar

De topbar bevat:

- `FAMILIE AGENDA`;
- een dynamisch bereik van dag 0 tot en met dag 3;
- de actuele tijd uit `ha_time`;
- een groene live-indicator.

De tekst gebruikt de bestaande Montserrat-fonts. Indien nodig worden alleen aanvullende kleine Montserrat-formaten toegevoegd.

## Vandaag

Dag 0 wordt als detailpaneel getoond.

- Kop: `Vandaag` plus de dynamische weekdag en datum.
- Maximaal vijf zichtbare afspraken.
- Iedere afspraak heeft een tijdlabel, een smalle persoonskleur, een donkere afgeronde kaart, een titel en een persoonschip.
- Afspraken vóór de huidige tijd worden visueel gedimd.
- Tussen de laatste verstreken en eerste toekomstige afspraak staat een `NU · HH:MM`-indicator.
- Bij meer dan vijf afspraken verschijnt onderaan `+N meer`.
- Bij geen afspraken verschijnt `Geen afspraken`.

Een hele-dag-afspraak toont `dag` als tijd en telt niet als verstreken op basis van een kloktijd.

## Komende drie dagen

Dag 1, 2 en 3 krijgen elk een vaste sectie in het rechterpaneel.

- Kop met datumcirkel, weekdag en totaal aantal afspraken.
- Maximaal twee zichtbare afspraken per dag.
- Compacte afspraakrij met tijd of `dag`, persoonskleur, titel en persoonschip.
- Bij meer dan twee afspraken verschijnt `+N meer`.
- Bij geen afspraken verschijnt `Geen afspraken`.

De sensoren voor dag 4 tot en met dag 6 blijven bestaan voor compatibiliteit, maar worden niet meer op deze pagina gerenderd.

## Data en parsing

De bestaande Home Assistant-sensoren blijven ongewijzigd:

- `agenda_d0_*` tot en met `agenda_d6_*`;
- iedere dag heeft titel, datum, count, maximaal acht events en more.

De bestaande eventtekst begint met `HH:MM` of `hele dag`. ESPHome splitst dit in:

- tijdlabel;
- zichtbare titel;
- persoonsidentiteit.

Persoonsdetectie is hoofdletterongevoelig en gebruikt herkenbare woorden in de eventtekst:

- Papa → `0x5A96EB`;
- Mama → `0xF5B45A`;
- Emma → `0x9678EB`;
- Lotte → `0x4ADE80`;
- Familie, Alle of onbekend → `0x96AAC3`.

Als de persoon als suffix of separator in de eventtekst staat, wordt die waar veilig uit de zichtbare titel verwijderd. Bij een onbekend formaat blijft de volledige opgeschoonde tekst zichtbaar en wordt de fallbackkleur gebruikt.

## LVGL-updategedrag

De bestaande intervalgestuurde update om de drie seconden blijft het enige updatepad voor de agenda.

De agenda-lambda:

1. reinigt `unknown`, `unavailable`, `None` en lege waarden;
2. vult topbar en dagkoppen;
3. parseert de benodigde events van dag 0 tot en met dag 3;
4. toont of verbergt vaste LVGL-slots;
5. stelt teksten, kleuren en opacity per slot in;
6. positioneert de NU-indicator op basis van de huidige tijd;
7. vult lege- en meer-indicatoren.

Er worden geen nieuwe Home Assistant-entiteiten of callbacks toegevoegd.

## Scope en behoud

- De bestaande navigatierail en globale statusbalk blijven intact.
- Andere LVGL-pagina’s blijven intact.
- Bestaande niet-gerelateerde lokale wijzigingen in `esphome/ha-display-7.yaml` blijven behouden.
- Event-taps krijgen in deze versie geen actie.
- Gradients en shadows uit HTML worden alleen benaderd waar LVGL dit goedkoop en betrouwbaar ondersteunt; functionele leesbaarheid gaat voor.

## Verificatie

Na implementatie:

1. YAML- en ESPHome-configvalidatie uitvoeren.
2. Indien lokaal mogelijk een volledige compile uitvoeren.
3. Statisch controleren op ontbrekende of dubbele LVGL-id’s.
4. De volgende toestanden nalopen:
   - geen afspraken;
   - één en meerdere afspraken;
   - meer dan vijf afspraken vandaag;
   - meer dan twee afspraken op een toekomstige dag;
   - verstreken en toekomstige afspraken;
   - hele-dag-afspraken;
   - lange titels en onbekende persoonsnamen.

## Acceptatiecriteria

- De agenda toont Vandaag groot links en exact drie komende dagen compact rechts.
- De visuele hiërarchie en kleuren volgen de handoff.
- De bestaande navigatierail blijft bruikbaar.
- De agenda gebruikt uitsluitend de bestaande HA-agendasensoren.
- De configuratie valideert zonder ontbrekende widget-id’s of verwijzingen naar verwijderde widgets.
