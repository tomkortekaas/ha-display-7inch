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
- een numeriek toetsenbord voor een vrij aantal hele minuten;
- een prominente knop **Start op iDot**.

Een vaste keuze vult de tijd direct in. Numerieke invoer vervangt de gekozen waarde.
Nul minuten kan niet worden gestart. De eerste versie ondersteunt geen losse seconden.

### Lopende timer

Tijdens het aftellen toont het timerscherm de resterende tijd en drie bedieningen:

- **Pauzeren** of **Hervatten**;
- **+1 minuut**;
- **Stoppen**.

Stoppen annuleert zonder alarm en herstelt de normale iDot-schermrotatie. De timer blijft
in Home Assistant lopen wanneer de gebruiker vanaf het timerscherm terug navigeert. Bij
terugkeer leest het scherm de actuele toestand en resterende tijd opnieuw in.

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
status te wijzigen.

## Architectuur en gegevensstroom

### 7-inch webinterface

De bestaande webinterface krijgt de Timer-tegel en een apart timerscherm. De browser
praat niet rechtstreeks met Home Assistant en bevat geen Home Assistant-token.

Het timerscherm gebruikt serverroutes voor de opdrachten `start`, `pause`, `resume`,
`add-minute`, `stop` en `acknowledge`. Een statusroute levert minimaal status,
resterende seconden en ingestelde duur. Tijdens een zichtbaar timerscherm wordt deze
status periodiek opgehaald, zodat de weergave ook na navigatie of een herlaadbeurt klopt.

### Serverkoppeling

De server van het 7-inch scherm bewaart het Home Assistant-token uitsluitend aan de
serverkant en vertaalt de UI-opdrachten naar Home Assistant-services. De server valideert
de actie en duur, maar bewaart zelf geen gezaghebbende timerstatus.

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
- Na herstart van de webinterface wordt de toestand uit Home Assistant hersteld.
- Na herstart van Home Assistant wordt een niet-herstelbare lopende timer veilig naar
  `idle` teruggebracht; er mag geen verborgen alarm- of gonglus achterblijven.

## Testcriteria

1. De Timer-tegel staat links direct onder Recepten en opent het timerscherm.
2. De vaste keuzes en numerieke minuteninvoer starten een geldige timer.
3. Nul of ongeldige invoer kan niet worden gestart.
4. De iDot-rotatie stopt en de aftelling verschijnt op iDot.
5. Pauzeren, hervatten en `+1 minuut` blijven synchroon op beide schermen.
6. Stoppen annuleert zonder gong en hervat de iDot-rotatie.
7. Navigeren of herladen verliest een lopende timer niet.
8. Bij afloop blijft de gong herhalen en blijft iDot `00:00` tonen.
9. Alleen **Alarm uit** stopt de gonglus en hervat de iDot-rotatie.
10. Een mislukte Home Assistant- of iDot-opdracht wordt zichtbaar afgehandeld.

