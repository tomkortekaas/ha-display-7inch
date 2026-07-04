# Handoff: Familie Agenda — Week-view C · Focus + Sidebar

## Overzicht
Dit scherm toont een week-agenda (Google Calendar) op het **Guition 7" touchpaneel (800×480)**.
Variant **C — Focus + Sidebar** is gekozen: vandaag gedetailleerd links, de komende 3 dagen compact rechts.
Data komt uit de Google Calendar-integratie in Home Assistant.

## Over de design-bestanden
De bestanden in dit pakket zijn **HTML-prototypes** — visuele referenties die het beoogde
uiterlijk en gedrag tonen, gebouwd in React/JSX. De taak is om dit ontwerp te herbouwen in
**ESPHome/LVGL YAML**, passend bij het bestaande huisdisplay-systeem (zie `SKILL-huisdisplay.md`
en de bestaande schermen in het project). Kopieer de HTML niet direct — gebruik het als
pixel-nauwkeurige referentie.

## Fidelity
**High-fidelity.** Kleur, typografie, spacing en interactie zijn definitief. Herbouw zo dicht
mogelijk bij het prototype; afwijkingen alleen waar LVGL technische beperkingen oplegt.

---

## Layout-structuur

```
 800px
┌──────────────────────────────────────────────────────────────────────┐  ▲
│  FAMILIE AGENDA   WO 18–ZA 21 JUNI                    12:45  ●      │  │ 46px topbar
├──────────────────────────────────────┬───────────────────────────────┤  ▼
│  Vandaag          WO 18 JUNI         │  Do  19                       │
│                                      │  08:00  ▌ Schoolfeest  Emma  │  ▲
│  07:30 ▌ Standup           Papa  ░   │  19:00  ▌ Buurtverg.   Papa  │  │
│  09:00 ▌ Yoga              Mama  ░   ├───────────────────────────────┤  │
│  ──────────── NU · 12:45 ─────────── │  Vr  20                       │  │ 434px
│  14:30 ▌ Tandarts          Lotte     │  14:00  ▌ Voetbal      Lotte  │  │
│  16:00 ▌ Zwemles           Emma      ├───────────────────────────────┤  │
│  18:30 ▌ Eten bij opa      Familie   │  Za  21                       │  │
│                                      │  11:00  ▌ Doktersafsp. Papa   │  ▼
│◄──────────── 420px ─────────────────►│◄──────────── 380px ──────────►│
└──────────────────────────────────────┴───────────────────────────────┘
  ░ = opacity 0.38 (verleden event)
```

---

## Design Tokens

### Kleuren
| Token          | Waarde                                                              | Gebruik                    |
|----------------|---------------------------------------------------------------------|----------------------------|
| `bg`           | `#08080a`                                                           | Paginabasis                |
| `bg-gradient`  | `radial-gradient(120% 90% at 50% -8%, #16171c 0%, #08080a 55%)`    | Wrapper                    |
| `surface`      | `#131418`                                                           | Event-kaarten              |
| `line`         | `rgba(255,255,255,.07)`                                             | Randen, dividers           |
| `text`         | `#ffffff`                                                           | Primaire tekst             |
| `text-muted`   | `rgba(255,255,255,.35)`                                             | Tijdlabels                 |
| `text-dim`     | `rgba(255,255,255,.28)`                                             | Subtitels, microtext       |
| **papa**       | `#5A96EB`                                                           | Kalenderkleur Papa         |
| **mama**       | `#F5B45A`                                                           | Kalenderkleur Mama         |
| **emma**       | `#9678EB`                                                           | Kalenderkleur Emma         |
| **lotte**      | `#4ADE80`                                                           | Kalenderkleur Lotte        |
| **alle**       | `#96AAC3`                                                           | Gezamenlijke afspraken     |
| `live-dot`     | `oklch(0.74 0.13 150)` ≈ `#4ade80`                                  | Live-indicator             |

### Typografie — Montserrat (Google Fonts / `gfonts://Montserrat@<weight>`)

| Element               | Size  | Weight | Extra                                          |
|-----------------------|-------|--------|------------------------------------------------|
| Brand label           | 13px  | 700    | `letter-spacing:3px`, `rgba(255,255,255,.85)`  |
| Topbar subtitel       | 10px  | 600    | `letter-spacing:1.5px`, `rgba(255,255,255,.28)`|
| Klok                  | 13px  | 600    | `tabular-nums`, `rgba(255,255,255,.5)`         |
| "Vandaag"             | 20px  | 800    | `letter-spacing:-.5px`, `#fff`                 |
| Datum "WO 18 JUNI"    | 11px  | 700    | `letter-spacing:2px`, `rgba(255,255,255,.30)`  |
| Tijdlabel event       | 11px  | 700    | `tabular-nums`, `rgba(255,255,255,.35)`        |
| Event-titel (links)   | 13px  | 700    | `#fff`                                         |
| Person-chip           | 9px   | 700    | `letter-spacing:.5px`                          |
| "NU · 12:45"          | 9px   | 800    | `letter-spacing:1.5px`, `rgba(255,255,255,.30)`|
| Dag-abbr (sidebar)    | 11px  | 700    | `letter-spacing:1.5px`, `rgba(255,255,255,.45)`|
| Sidebar event-titel   | 12px  | 700    | `rgba(255,255,255,.8)`, overflow ellipsis      |
| Sidebar tijdlabel     | 10px  | 700    | `tabular-nums`, `rgba(255,255,255,.32)`        |
| Micro-label (count)   | 9px   | 700    | `letter-spacing:2px`, `rgba(255,255,255,.25)`  |

### Spacing & Radii
| Element              | Waarde                         |
|----------------------|--------------------------------|
| Pagina-padding       | —  (elk paneel eigen padding)  |
| Linker panel padding | `14px 20px`                    |
| Rechter panel padding per kaart | `12px 20px`         |
| Event-kaart radius   | `12px`                         |
| Person-chip radius   | `6px` (links) / `4px` (sidebar)|
| Datumcirkel radius   | `8px`                          |
| Kleur-balk breedte   | `3px` (links) / `2.5px` (sidebar) |

---

## Componenten detail

### 1 · Topbar (46px hoog)
- `border-bottom: 1px solid rgba(255,255,255,.07)`
- `padding: 0 24px`
- **Links:** `"FAMILIE AGENDA"` (brand) + `"WO 18 – ZA 21 JUNI"` (subtitel), baseline-uitgelijnd, gap 9px
- **Rechts:** klok + live-dot, gap 8px
- Live-dot: 7×7px cirkel, kleur + `box-shadow: 0 0 7px color/.8`

---

### 2 · Linker panel — Vandaag (420px)
`border-right: 1px solid rgba(255,255,255,.07)`

#### 2a · Header
```
Vandaag  ·  WO 18 JUNI
```
- Flex-rij, baseline-uitgelijnd, gap 10px, `margin-bottom: 12px`

#### 2b · Event-rij
```
[38px tijd][3px balk h38][flex-1 kaart: titel ─────── chip]
```
- Tijdlabel: `width:38px, text-align:right, tabular-nums`
- Kleur-balk: `width:3px, height:38px, border-radius:2px, background:{who-color}`
- Kaart `background:#131418, border:1px solid {color}20, border-radius:12px, padding:9px 14px`
  - Titel: 13px/700/`#fff`
  - Chip: `background:{color}1a, color:{color}, padding:3px 9px, border-radius:6px, font:9px/700`
- **Verleden event** (tijd ≤ NOW): `opacity:0.38`
- Gap tussen rijen: `6px`

#### 2c · NU-indicator
Getoond tussen laatste verleden en eerste toekomstige event:
```
─────────────────── NU · HH:MM ───────────────────
              padding-left: 50px
```
- Twee flex-1 lijnen: `height:1px, background:rgba(255,255,255,.1)`
- Label: `font:9px/800, letter-spacing:1.5px, color:rgba(255,255,255,.30)`

---

### 3 · Rechter panel — Komende 3 dagen (flex:1 ≈ 380px)
- Drie secties, elk `flex:1` (≈ 144px hoog)
- Dividers: `border-bottom:1px solid rgba(255,255,255,.07)` (niet na de laatste)

#### 3a · Dag-kop
```
[28px cirkel  dag] [DAG-ABBR] ────────── [N AFSPRAKEN]
```
- Datumcirkel: `28×28px, border-radius:8px, border:1px solid rgba(255,255,255,.1), background:rgba(255,255,255,.04)`
- Dag-abbr: 11px/700/`letter-spacing:1.5px`
- Teller: micro-label rechts (`margin-left:auto`)
- `margin-bottom: 9px`

#### 3b · Compact event-rij (max 2 per dag)
```
[38px tijd][2.5px balk h20][flex-1 titel][chip]
```
- Balk hoogte: **20px** (compacter dan linker panel)
- Chip: `padding:2px 7px, border-radius:4px`
- Hele-dag event: tijdlabel toont `"dag"` i.p.v. kloktijd, `rgba(255,255,255,.28)`
- `> 2` events: `"+N meer"` label, `padding-left:46px, font:10px/600, color:rgba(255,255,255,.25)`
- Geen events: `"Geen afspraken"` italic, `rgba(255,255,255,.18)`

---

## Interactie & gedrag

| Situatie | Gedrag |
|---|---|
| Data update uit HA | `refresh_agenda` script overschrijft alle label-teksten + kleuren |
| Middernacht | Dag-rotatie: "vandaag" wordt "morgen"; 3 toekomstige dagen schuiven op |
| Tik op event | Geen actie vereist in v1 |
| Navigatie | Standaard linker/rechter tikzones voor swipe (zie §4.6 `SKILL-huisdisplay.md`) |
| Klok | `time`-component, elke minuut triggert `refresh_agenda` |

---

## State management (ESPHome globals)

### Vandaag — 5 event-slots

```yaml
globals:
  # Per slot (herhaal voor ev1_ t/m ev4_):
  - id: ev0_time,   type: std::string, initial_value: '""'
  - id: ev0_title,  type: std::string, initial_value: '""'
  - id: ev0_who,    type: int,         initial_value: "4"  # 4 = verborgen/leeg
  - id: ev0_past,   type: bool,        initial_value: "false"
  # NU-indicator: na welke slot-index tonen (-1 = niet tonen)
  - id: now_after_slot, type: int, initial_value: "-1"
  # Huidig tijdstip (voor NU-indicator berekening)
  - id: now_h, type: int
  - id: now_m, type: int
```

### Komende dagen — 3 kaarten × 2 slots

```yaml
globals:
  # Per dag (herhaal voor day2_ en day3_):
  - id: day1_abbr,        type: std::string  # "DO"
  - id: day1_date,        type: int          # 19
  - id: day1_count,       type: int          # totaal aantal events
  - id: day1_ev0_time,    type: std::string
  - id: day1_ev0_title,   type: std::string
  - id: day1_ev0_who,     type: int
  - id: day1_ev0_allday,  type: bool
  - id: day1_ev1_time,    type: std::string
  - id: day1_ev1_title,   type: std::string
  - id: day1_ev1_who,     type: int
  - id: day1_ev1_allday,  type: bool
```

---

## ESPHome/LVGL implementatienotes

### Font-declaraties

```yaml
font:
  - file: "gfonts://Montserrat@800"
    id: font_ag_hero     # "Vandaag" 20px
    size: 20
  - file: "gfonts://Montserrat@700"
    id: font_ag_brand    # topbar brand 13px
    size: 13
  - file: "gfonts://Montserrat@700"
    id: font_ag_event    # event-titel 13px
    size: 13
  - file: "gfonts://Montserrat@700"
    id: font_ag_time     # tijdlabels 11px
    size: 11
  - file: "gfonts://Montserrat@700"
    id: font_ag_sidebar  # sidebar event-titel 12px
    size: 12
  - file: "gfonts://Montserrat@700"
    id: font_ag_micro    # chips, micro 9px
    size: 9
  - file: "gfonts://Montserrat@600"
    id: font_ag_sub      # subtitel topbar 10px
    size: 10
```

### Kleur-lookup lambda

```cpp
lv_color_t agenda_who_color(int who) {
  switch(who) {
    case 0: return lv_color_hex(0x5A96EB); // papa
    case 1: return lv_color_hex(0xF5B45A); // mama
    case 2: return lv_color_hex(0x9678EB); // emma
    case 3: return lv_color_hex(0x4ADE80); // lotte
    default:return lv_color_hex(0x96AAC3); // alle/onbekend
  }
}
```

### Strategie: vaste widget-slots
Maak **5 vaste event-slot objecten** in LVGL (voor vandaag) en **6 compact-slot objecten**
(3 dagen × 2 rijen). Het `refresh_agenda`-script vult ze vanuit globals en
toont/verbergt via `LV_OBJ_FLAG_HIDDEN`.

De NU-indicator is een apart object; het script positioneert het tussen de juiste
event-slots op basis van `now_after_slot`.

### Home Assistant Calendar-integratie

```yaml
# configuration.yaml — haal vandaag + 3 dagen events op (elke 5 min)
template:
  - trigger:
      - platform: time_pattern
        minutes: "/5"
    action:
      - service: calendar.get_events
        target:
          entity_id:
            - calendar.papa     # >>> TODO: pas aan
            - calendar.mama     # >>> TODO: pas aan
            - calendar.emma     # >>> TODO: pas aan
            - calendar.lotte    # >>> TODO: pas aan
        data:
          start_date_time: "{{ now().replace(hour=0,minute=0,second=0).isoformat() }}"
          end_date_time: >
            {{ (now() + timedelta(days=4)).replace(
               hour=0,minute=0,second=0).isoformat() }}
        response_variable: agenda_events
      # Verwerk agenda_events → text_sensors voor ESPHome
```

Maak per event-slot een `text_sensor` met `homeassistant`-platform die de
verwerkte waarde levert (tijd, titel, wie).

---

## Benodigde bestanden

| Bestand                    | Omschrijving                                              |
|----------------------------|-----------------------------------------------------------|
| `Familie Agenda.html`      | Design canvas — alle 6 schermen naast elkaar, interactief |
| `g7-calendar-week.jsx`     | Broncode van de drie week-view layouts (incl. variant C)  |
| `g7-calendar.jsx`          | Broncode dag-view varianten (referentie stijl)            |
| `SKILL-huisdisplay.md`     | Design system: tokens, patronen, LVGL-conventies          |

---

## Opleverchecklist

- [ ] `>>> TODO` Google Calendar HA-entiteit-IDs invullen
- [ ] `>>> TODO` HA-template sensor aanmaken die events per slot exporteert
- [ ] Fonts: 7 Montserrat-declaraties toegevoegd
- [ ] Globals: 5 × vandaag-slots + 3 × 2 sidebar-slots gedeclareerd
- [ ] `refresh_agenda` script: leest globals → update labels + kleur-balken + opacity
- [ ] NU-indicator: positie berekend uit huidige tijd vs. event-tijden
- [ ] Dag-rotatie bij middernacht (`on_time: then: script.execute: refresh_agenda`)
- [ ] Navigatie-tikzones links/rechts (§4.6 SKILL-huisdisplay.md)
- [ ] Pagina-indicator mee bijgewerkt voor multi-page setup
- [ ] Minimale tikdoelen ≥ 44px; tekst ≥ 12px
- [ ] Geen tekst of widgets buiten de 800×480-rand
