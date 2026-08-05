# iDot-keukentimer vanaf het 7-inch scherm

## Doel

Voeg op het 7-inch huisdisplay een eenvoudige keukentimer toe. De gebruiker opent de
timer via een nieuwe tegel onder **Recepten**, stelt één timer in en ziet de aftelling
zowel op het 7-inch scherm als op het iDotMatrix-scherm. Bij afloop blijft de Reolink-gong
herhalen totdat de gebruiker op het 7-inch scherm expliciet op **Alarm uit** drukt.

## Afbakening

- Er kan één timer tegelijk lopen.
- De timer wordt alleen op het 7-inch scherm bediend.
- Er komt geen fysieke bediening via de Aqara-kubus.
- Het alarm geeft geen aparte pop-up op andere apparaten.
- De Reolink-gong is de enige geluidsmelding.
- De normale iDot-schermrotatie wordt tijdens de timer onderbroken en pas na stoppen of
  het bevestigen van het alarm hervat.

## Gebruikersinterface

### Navigatietegel

In de linkerkolom van het hoofdscherm komt direct onder de tegel **Recepten** een nieuwe
tegel **Timer** met een duidelijk klok- of timericoon. De tegel gebruikt dezelfde maat,
vormgeving en interactiestijl als de bestaande navigatietegels.

Een tik op de tegel opent een afzonderlijk timerscherm. De recepteninterface zelf wordt
niet aangepast.

### Timer instellen

Het lege timerscherm bevat:

- een terugknop naar het vorige scherm;
- een grote tijdweergave;
- vaste keuzes voor 5, 10, 15 en 20 minuten;
- twee selecteerbare numerieke velden voor minuten (`0–99`) en seconden (`0–59`);
- een numeriek toetsenbord dat het geselecteerde veld invult;
- een prominente knop **Start op iDot**.

Een vaste keuze vult hele minuten in en zet seconden op nul. Numerieke invoer vervangt
de waarde van het geselecteerde veld. Een timer kan starten zodra de totale duur minimaal
één seconde is.

### Lopende timer

Tijdens het aftellen toont het timerscherm de resterende tijd en drie bedieningen:

- **Pauzeren** of **Hervatten**;
- **+1 minuut**;
- **Stoppen**.

Stoppen annuleert zonder alarm en herstelt de normale iDot-schermrotatie. De timer blijft
in Home Assistant lopen wanneer de gebruiker vanaf het timerscherm terug navigeert. Bij
terugkeer leest het scherm de actuele toestand en resterende tijd opnieuw in.

De zichtbare klok op het 7-inch scherm loopt iedere seconde mee. Home Assistant publiceert
het `remaining`-attribuut van een actieve timer niet iedere seconde; daarom berekent
ESPHome de lopende tijd lokaal uit het `finishes_at`-tijdstip. Bij pauzeren gebruikt het
display de vaste `remaining`-waarde. Iedere nieuwe Home Assistant-statusupdate corrigeert
de lokale weergave, zodat Home Assistant de gezaghebbende bron blijft.

### Afgelopen timer

Bij afloop gaat de timer naar de toestand `alarming`. Het iDot-scherm blijft `00:00`
tonen en de Reolink-gong wordt met een korte tussenpauze herhaald. Het 7-inch timerscherm
toont een opvallende alarmweergave met één grote knop **Alarm uit**.

De gonglus en de iDot-timermodus stoppen uitsluitend nadat **Alarm uit** is ingedrukt.
Daarna gaat de status terug naar `idle` en hervat de normale schermrotatie.

## Toestandsmodel

Home Assistant is de centrale eigenaar van de timerstatus. De vier toestanden zijn:

- `idle`: geen actieve timer;
- `running`: timer telt af;
- `paused`: timer is gepauzeerd;
- `alarming`: timer is afgelopen en de gonglus loopt.

Geldige overgangen:

- `idle → running`: starten met een geldige duur;
- `running → paused`: pauzeren;
- `paused → running`: hervatten;
- `running → alarming`: timer loopt af;
- `running|paused → idle`: stoppen;
- `alarming → idle`: **Alarm uit**.

`+1 minuut` verandert de resterende duur in `running` en `paused`, zonder de overige
status te wijzigen. Home Assistant start zijn timer opnieuw met de nieuwe resterende
duur en stuurt diezelfde minuten/seconden als een nieuwe native countdownstart naar iDot.
ESPHome werkt de zichtbare tijd direct bij en synchroniseert daarna opnieuw met Home
Assistant.

## Architectuur en gegevensstroom

### ESPHome/LVGL-interface

De bestaande ESPHome/LVGL-interface krijgt de Timer-tegel en een zevende LVGL-pagina.
De tegel staat in dezelfde uitschuifbare navigatierail als Recepten. De rail wordt
verticaal compacter gemaakt zodat Timer direct onder Recepten past en alle aanraakvlakken
minimaal 44 pixels hoog blijven.

Het timerscherm gebruikt de bestaande ESPHome native API voor de opdrachten `start`,
`pause`, `resume`, `add-minute`, `stop` en `acknowledge`. Daarvoor zijn geen webserver,
browser of Home Assistant-token nodig. Home Assistant-sensoren voor status en resterende
tijd worden als interne ESPHome-sensoren gespiegeld en werken de LVGL-labels en zichtbare
bedieningen bij.

De Recipe Hub en de Photo Swipe-server worden voor deze functie niet gewijzigd.

### Home Assistant

Home Assistant beheert:

- een statushelper met de vier toestanden;
- een timerhelper;
- scripts of automatiseringen voor starten, pauzeren, hervatten, verlengen, stoppen en
  alarm bevestigen;
- het uitschakelen en hervatten van de normale iDot-rotatie;
- de herhalende Reolink-gong tijdens `alarming`.

De alarmlus moet annuleerbaar zijn. Een script in `restart`-modus of een herhaalautomatie
met een statusvoorwaarde controleert voor iedere gong of de status nog `alarming` is.
Hierdoor stopt de lus direct en betrouwbaar na **Alarm uit** en wordt geen tweede
gelijktijdige gonglus gestart.

### iDotMatrix

Bij starten schakelt Home Assistant de normale rotatie uit en activeert de native
iDotMatrix-countdown. Pauzeren, hervatten, verlengen en stoppen worden naar dezelfde
countdownfunctie vertaald. Bij afloop blijft `00:00` zichtbaar tot bevestiging.

De bestaande iDotMatrix-integratie biedt momenteel nog geen `set_countdown`-service.
Toevoegen en verifiëren van deze service is daarom een expliciete technische
voorwaarde voor de timer. De UI mag pas succes melden nadat Home Assistant de opdracht
heeft geaccepteerd.

## Foutafhandeling

- Is Home Assistant niet bereikbaar, dan blijft de huidige UI-status zichtbaar met een
  duidelijke foutmelding en een knop om opnieuw te proberen.
- Mislukt starten op iDot, dan wordt de Home Assistant-timer niet stilzwijgend als
  succesvol gepresenteerd.
- Mislukt één gongoproep, dan blijft `alarming` actief en probeert de lus het bij de
  volgende cyclus opnieuw.
- Na herstart van het display wordt de toestand uit Home Assistant hersteld.
- Na herstart van Home Assistant wordt een niet-herstelbare lopende timer veilig naar
  `idle` teruggebracht; er mag geen verborgen alarm- of gonglus achterblijven.

## Testcriteria

1. De Timer-tegel staat links direct onder Recepten en opent het timerscherm.
2. De vaste keuzes en afzonderlijke minuten-/secondeninvoer starten een geldige timer.
3. `00:00`, meer dan 99 minuten of meer dan 59 seconden kan niet worden gestart.
4. De iDot-rotatie stopt en de aftelling verschijnt op iDot.
5. De tijd op het 7-inch scherm telt iedere seconde zichtbaar af en blijft synchroon met
   Home Assistant en iDot.
6. Pauzeren, hervatten en `+1 minuut` werken de tijd direct en gelijk bij op beide schermen.
7. Stoppen annuleert zonder gong en hervat de iDot-rotatie.
8. Navigeren of herladen verliest een lopende timer niet.
9. Bij afloop blijft de gong herhalen en blijft iDot `00:00` tonen.
10. Alleen **Alarm uit** stopt de gonglus en hervat de iDot-rotatie.
11. Een mislukte Home Assistant- of iDot-opdracht wordt zichtbaar afgehandeld.
