# Instructie voor Claude — voeg het WEERSCHERM toe aan de bestaande config

Je krijgt een bestaande ESPHome-config voor een 4″ 480×480 touchpaneel met **twee LVGL-pagina's**
(afzuigkap + Immich-fotolijst). Voeg daar een **derde pagina** aan toe: het weerscherm. De volledige
UI + logica staat kant-en-klaar in **`weerscherm.yaml`**. Jouw taak is dat netjes te mergen — niet
opnieuw ontwerpen.

> Stijl ligt vast (zwart 0x08080A, Montserrat, ronde surfaces, MDI-iconen). Niet afwijken.
> Alles wat je moet invullen staat in `weerscherm.yaml` gemarkeerd met `>>> TODO`.

---

## Volgorde van werken

### 1. `font:` — voeg de weer-fonts toe
Plak de `font:`-entries uit `weerscherm.yaml` onder je bestaande `font:` blok.
- Nieuw: `font_temp_big`, `font_cond`, `font_day_num`, `font_meta`, `font_uv`, en de MDI-fonts
  `font_wx_big` / `font_wx_small` / `font_mini` (met hun `glyphs:`-lijst).
- **Niet** dupliceren: `font_brand`, `font_status`, `font_num` bestaan al in de afzuigkap-config — die
  hergebruikt het weerscherm.
- ⚠️ Controleer de MDI-glyph-escapes (`\U000Fxxxx`) tegen jouw ESPHome-versie. Werkt dat niet, gebruik
  dan het echte glyph-teken of de `0xFxxxx`-notatie.

### 2. `globals:` — voeg de cache toe
Plak `wk_tmin` en `wk_tmax` onder je bestaande `globals:` blok.

### 3. `sensor:` / `text_sensor:` — koppel Home Assistant
Plak de `homeassistant`-sensoren en text_sensoren onder je bestaande blokken en **vervang elke
`entity_id` (`>>> TODO`)** door die van de gebruiker:
- Huidig weer: `weather.<...>` (temperatuur, wind, wind_bearing) + een UV-sensor.
- 5-daagse forecast: maak in Home Assistant de template-sensoren aan via `weather.get_forecasts`
  (`type: daily`) — het **volledige voorbeeld staat als comment in `weerscherm.yaml`**. Je hebt per dag
  nodig: `hi`, `lo`, `cond`, `wind` voor index 0..4.
- Zonsop-/ondergang: uit de `sun`-integratie.

### 4. `time:` — klok
Als je al een `time: homeassistant` (`ha_time`) hebt, hergebruik die en laat `refresh_clock` erop
triggeren. Anders plak het `time:`-blok uit `weerscherm.yaml`.

### 5. `lvgl: -> pages:` — voeg de pagina toe
Plak de hele `weather_page` onder `lvgl: pages:`. **Zet 'm in de gewenste swipe-volgorde** t.o.v. je
andere twee pagina's (de volgorde van `pages:` bepaalt links/rechts vegen).

De pagina bevat al: hero (icoon + temp + conditie + wind), de **gecombineerde zon/UV-kaart** (UV-index
in de boog, kleur volgt het niveau, met insmeer-advies), de **neerslag-staafjes** (volle breedte,
`chart type: BAR`), en de **5-daagse forecast** met temperatuurbalken.

### 6. `script:` — voeg de refresh-scripts toe
Plak `refresh_weather` en `refresh_clock` onder je bestaande `script:` blok.
- `refresh_weather` wordt al aangeroepen vanuit de `on_value:` van de sensoren.
- Roep `refresh_weather` ook eenmalig aan in `esphome: -> on_boot:` (naast je bestaande
  `refresh_ui`), zodat het scherm bij opstart klopt.
- `refresh_clock` triggert op `ha_time` (elke minuut).

### 7. Navigatie — pagina-indicator + tikzones op ALLE drie de pagina's
In `weather_page` staat al een werkende implementatie (3 stipjes `TOP_MID` + twee onzichtbare
tikzones links/rechts → `lvgl.page.previous` / `lvgl.page.next`). Doe dit:
- Plak het **indicator-blok** en de **twee tikzone-buttons** óók op je afzuigkap- en fotopagina.
- Verschuif per pagina de brede "on"-stip (de `obj` met `width: 16`, vol wit) naar de juiste positie:
  1e stip = afzuigkap, 2e = foto, 3e = weer (volg je `pages:`-volgorde).

---

## Wat NIET nodig is (veelgestelde vragen)

- **Temperatuur-overgangen** (de koud→warm balken): niks extra. `refresh_weather` berekent de kleur op
  het apparaat uit de forecast lo/hi en zet 'm als horizontale 2-staps gradient op de balk
  (`bg_color` = lo, `bg_grad_color` = hi, `bg_grad_dir: HOR`). Geen extra sensoren of assets.
- **UV-advies**: gebruikt alleen de UV-sensor; drempel = WHO (vanaf UV 3 "smeer je in").
- **Geen iconen in het UV-advies**: bewust platte tekst.

## Eindcheck
- [ ] Alle `>>> TODO` entity_id's ingevuld; HA forecast-template-sensoren aangemaakt.
- [ ] MDI-glyph-escapes kloppen voor jouw ESPHome-versie.
- [ ] `weather_page` staat in de juiste swipe-volgorde onder `pages:`.
- [ ] Indicator + tikzones op alle 3 de pagina's; brede stip per scherm verschoven.
- [ ] `refresh_weather` in `on_boot` + via sensor-`on_value`; `refresh_clock` op `ha_time`.
- [ ] `chart type: BAR` en `bg_grad_*` op de balken worden door jouw LVGL/ESPHome-versie ondersteund
      (anders: 1 vlakke kleur per balk als fallback).
- [ ] Niets valt onder de 480px-rand; tekst ≥12px.

Bij twijfel over een widget-property: houd 'm aan tegen de actuele ESPHome-LVGL-docs; de structuur en
posities in `weerscherm.yaml` zijn leidend.
