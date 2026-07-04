# Scrollable Future Agenda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toon maximaal acht afspraken per komende dag in een afzonderlijk verticaal scrollgebied, met drie volledig zichtbare tweeregelige items en zonder persoonslabel.

**Architecture:** De vaste dagkoppen blijven directe kinderen van `agenda_focus_sidebar`. Iedere dag krijgt daaronder een begrensd LVGL-object dat alleen verticaal scrollt en acht absoluut gepositioneerde slots bevat. De bestaande interval-lambda leest alle acht Home Assistant-events, vult de slots en verbergt ongeldige items.

**Tech Stack:** ESPHome 2026.5.3, ESP-IDF, LVGL, YAML met C++-lambda’s, Guition JC1060P470.

## Global Constraints

- Behoud het agenda-canvas van `936×544` en de bestaande linker `Vandaag`-kolom.
- Iedere datumkop blijft vast staan terwijl alleen de afspraken eronder scrollen.
- Toon bij de beginpositie drie volledige afspraken per komende dag.
- Iedere titel gebruikt maximaal twee volledige regels.
- Gebruik de bestaande `agenda_dN_event_1` tot en met `agenda_dN_event_8` sensoren.
- Verwijder het persoonslabel en besteed de volledige vrijgekomen breedte aan de titel.
- Upload na validatie via `/dev/cu.usbmodem21201`.

---

### Task 1: Structurele regressiecontrole

**Files:**
- Create: `/tmp/check_agenda_future_scroll.py`
- Test: `/tmp/check_agenda_future_scroll.py`

**Interfaces:**
- Consumes: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml`
- Produces: een statische controle op drie scrollgebieden, acht slots per dag, tweeregelige titels en afwezigheid van zichtbare persoonslabels.

- [ ] **Step 1: Schrijf de falende structurele test**

De test leest de YAML als tekst en controleert per dag op `agenda_future_dN_scroll`, slots 1–8, `scroll_dir: VER`, `scrollbar_mode: AUTO`, titelbreedte van minimaal 300 px, titelhoogte voor twee regels en afwezigheid van `lbl_agenda_future_dN_who_*`.

- [ ] **Step 2: Voer de test uit en verifieer RED**

Run: `python3 /tmp/check_agenda_future_scroll.py`

Expected: FAIL omdat scrollcontainers en slots 4–8 nog ontbreken.

### Task 2: Scrollbare dagpanelen en acht slots

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml:4817`
- Test: `/tmp/check_agenda_future_scroll.py`

**Interfaces:**
- Consumes: bestaande datumkoppen en `agenda_d1_*`, `agenda_d2_*`, `agenda_d3_*`.
- Produces: `agenda_future_d1_scroll`, `agenda_future_d2_scroll`, `agenda_future_d3_scroll` met per dag acht slots en bijbehorende accent-, tijd- en titellabels.

- [ ] **Step 1: Vervang de drie vaste slotgroepen**

Maak per dag een object van circa `390×126` met `scrollable: true`, `scroll_dir: VER`, `scrollbar_mode: AUTO`, `scroll_momentum: true` en alleen verticale scroll chaining uit. Plaats acht slots van circa 56 px hoog op een interval van 58 px.

- [ ] **Step 2: Geef titels twee regels en maximale breedte**

Plaats tijd links, accent op x 58 en titel vanaf x 72 tot vrijwel de rechterrand. Gebruik `height: 40`, `width: 306` en `long_mode: WRAP`. Maak geen persoonslabels aan.

- [ ] **Step 3: Voer de structurele test uit**

Run: `python3 /tmp/check_agenda_future_scroll.py`

Expected: PASS met `agenda future scroll structure: OK`.

### Task 3: Acht events dynamisch vullen

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml:6455`
- Test: `/tmp/check_agenda_future_scroll.py`

**Interfaces:**
- Consumes: `agenda_dN_event_1.state` tot en met `agenda_dN_event_8.state`.
- Produces: een `update_future_day`-helper die arrays van acht events, slots, accenten, tijdlabels en titellabels bijwerkt.

- [ ] **Step 1: Breid de helper uit naar acht events**

Vervang de drie losse eventparameters door acht eventwaarden en geef acht widget-ID’s per array door. Loop met `i < 8`, zet tijd en titel, kleur het accent via `style_event` en verberg ongeldige slots.

- [ ] **Step 2: Verwijder `who` en `+N meer` uit komende dagen**

Roep `style_event` aan zonder persoonswidgets, verwijder de toekomstige `more_label`-berekening en reset het scrollgebied naar boven wanneer een dag van leeg naar gevuld gaat of de datum verandert.

- [ ] **Step 3: Werk alle drie helperaanroepen bij**

Geef voor iedere dag events 1–8 en de acht slot-, accent-, tijd- en titel-ID’s door.

- [ ] **Step 4: Voer de structurele test opnieuw uit**

Run: `python3 /tmp/check_agenda_future_scroll.py`

Expected: PASS.

### Task 4: ESPHome-validatie en apparaatoplevering

**Files:**
- Verify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: de aangepaste ESPHome-configuratie.
- Produces: gevalideerde, gecompileerde en via USB geïnstalleerde firmware.

- [ ] **Step 1: Controleer diff en YAML**

Run: `git diff --check -- esphome/ha-display-7.yaml`

Expected: exit 0.

Run: `esphome config esphome/ha-display-7.yaml`

Expected: `Configuration is valid!`.

- [ ] **Step 2: Compileer volledig**

Kopieer YAML en secrets naar een tijdelijk pad zonder spaties en voer `esphome compile <temp-yaml>` uit.

Expected: `Successfully compiled program`.

- [ ] **Step 3: Upload via USB**

Run: `esphome upload <temp-yaml> --device /dev/cu.usbmodem21201`

Expected: `Successfully uploaded program`.

- [ ] **Step 4: Controleer de opstartlog**

Run: `esphome logs <temp-yaml> --device /dev/cu.usbmodem21201`

Expected: LVGL start op `1024×600`, wifi krijgt een IP-adres en agenda-events 1–8 worden geregistreerd.
