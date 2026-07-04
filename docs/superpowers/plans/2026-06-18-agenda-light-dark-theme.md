# Agenda Light/Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een lokaal bewaarde licht/donker-schakelaar toe aan alleen het agenda-canvas en verwijder de Familie-chips bij Vandaag.

**Architecture:** Eén bestaande LVGL-widgetboom blijft actief. Een herstelde globale boolean bepaalt het kleurenpalet; de bestaande agenda-interval-lambda past dat palet toe op canvas, kaarten, labels, datumtegels, scheidingen en de themaknop. De knop wijzigt de boolean direct, terwijl de volgende intervaltick alle stijlen synchroniseert.

**Tech Stack:** ESPHome 2026.5.3, ESP-IDF, LVGL, YAML met C++-lambda’s, Guition JC1060P470.

## Global Constraints

- De huidige donkere agenda blijft de standaardvariant.
- Alleen het agenda-canvas verandert; navigatie, statusbalk en overige pagina's blijven zwart.
- De lichte variant gebruikt `0xF5F5F7`, `0x1C1C1E`, `0x6E6E73`, `0xD7D7DC` en `0xFF3B30`.
- De themakeuze gebruikt `restore_value: yes`.
- Vandaag bevat geen persoonschips of persoonslabels.
- De scrollbare komende dagen en maximaal acht events per dag blijven werken.
- Upload via `/dev/cu.usbmodem21201`.

---

### Task 1: Structurele regressietest

**Files:**
- Create: `/tmp/check_agenda_theme.py`
- Test: `/tmp/check_agenda_theme.py`

**Interfaces:**
- Consumes: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml`
- Produces: controle op persistente boolean, themaknop, beide paletten, verwijderde Vandaag-chips en verbrede titels.

- [ ] **Step 1: Schrijf de falende test**

Controleer tekstueel op `agenda_light_theme`, `restore_value: yes`, `agenda_theme_button`, `lbl_agenda_theme_button`, de vijf lichte kleuren en de afwezigheid van `agenda_today_chip_*` en `lbl_agenda_today_who_*`. Controleer dat Vandaag-titels minimaal 350 px breed zijn.

- [ ] **Step 2: Verifieer RED**

Run: `python3 /tmp/check_agenda_theme.py`

Expected: FAIL omdat de themastaat en knop ontbreken en Vandaag nog chips bevat.

### Task 2: Vandaag vereenvoudigen en knop toevoegen

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml:1-70`
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml:4490-4800`
- Test: `/tmp/check_agenda_theme.py`

**Interfaces:**
- Produces: `agenda_light_theme`, `agenda_theme_button`, `lbl_agenda_theme_button` en vijf Vandaag-kaarten zonder persoonschip.

- [ ] **Step 1: Voeg persistente staat toe**

Voeg een boolean `agenda_light_theme` toe met `restore_value: yes` en `initial_value: 'false'`.

- [ ] **Step 2: Voeg de compacte knop rechtsboven toe**

Plaats de knop bovenaan rechts in het Vandaag-paneel, buiten de afspraken. Laat `on_click` de globale boolean omkeren.

- [ ] **Step 3: Verwijder chips en verbreed titels**

Verwijder alle vijf chipobjecten en labels. Maak iedere Vandaag-titel circa 356 px breed.

### Task 3: Dynamische themastyling

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml:6400-6750`
- Test: `/tmp/check_agenda_theme.py`

**Interfaces:**
- Consumes: `id(agenda_light_theme)`.
- Produces: dynamisch palet voor agenda-achtergrond, kaarten, primaire/secundaire tekst, lijnen, datumtegels, toekomstige titels en knop.

- [ ] **Step 1: Geef thematische objecten stabiele ID's**

Voeg ID's toe aan de verticale paneelscheiding, twee dagscheidingen en drie datumtegels.

- [ ] **Step 2: Pas het palet in de interval-lambda toe**

Bereken `light`, `surface`, `card`, `primary`, `secondary`, `divider` en `red`. Werk alle relevante object- en labelstijlen bij en zet knoptekst op `DONKER` of `LICHT`.

- [ ] **Step 3: Verwijder chiplogica**

Verwijder Vandaag-chip- en who-arrays. Roep `style_event` voor Vandaag aan met null-pointers voor chip en persoonslabel.

- [ ] **Step 4: Verifieer GREEN**

Run: `python3 /tmp/check_agenda_theme.py`

Expected: `agenda theme structure: OK`.

### Task 4: Validatie, compile en USB

**Files:**
- Verify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Produces: gevalideerde en geïnstalleerde firmware.

- [ ] **Step 1: Controleer diff en config**

Run: `git diff --check -- esphome/ha-display-7.yaml`

Run: `esphome config esphome/ha-display-7.yaml`

Expected: exit 0 en `Configuration is valid!`.

- [ ] **Step 2: Compileer volledig**

Kopieer YAML en secrets naar een tijdelijk pad zonder spaties en voer `esphome compile` uit.

Expected: `Successfully compiled program`.

- [ ] **Step 3: Upload via USB**

Run: `esphome upload <temp-yaml> --device /dev/cu.usbmodem21201`

Expected: `Successfully uploaded program`.

- [ ] **Step 4: Controleer boot**

Controleer LVGL 1024×600, wifi-IP en registratie van agenda-events in de seriële log.
