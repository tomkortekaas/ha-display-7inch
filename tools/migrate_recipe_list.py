#!/usr/bin/env python3
"""Eenmalige migratie (2026-09-29): receptenlijst van 24 HA-sensorslots naar
pagina's van 10 uit recipe-hub met één verzamelplaatje. Elk anker moet exact
één keer voorkomen; zo niet, dan stopt het script zonder te schrijven."""
import re
from pathlib import Path

YAML = Path(__file__).resolve().parents[1] / "esphome" / "ha-display-7.yaml"
s = YAML.read_text()


def replace_once(old: str, new: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"anker {count}x gevonden (verwacht 1): {old[:70]!r}")
    s = s.replace(old, new)


def cut_between(start: str, end: str, replacement: str) -> None:
    """Vervang alles vanaf `start` tot (niet inclusief) `end`."""
    global s
    if s.count(start) < 1:
        raise SystemExit(f"start-anker ontbreekt: {start[:70]!r}")
    i = s.index(start)
    j = s.index(end, i)
    s = s[:i] + replacement + s[j:]


# 1. Globals: oude thumbnail/HA-batching weg, nieuwe lijststatus erbij.
for gid in (
    "ah_recipes_dirty",
    "recipe_thumb_pending",
    "recipe_thumb_inflight",
    "recipe_thumb_inflight_id",
    "recipe_thumb_loaded_ids",
):
    s, n = re.subn(rf"  - id: {gid}\n(?:    .*\n)+", "", s)
    if n != 1:
        raise SystemExit(f"global {gid}: {n}x verwijderd (verwacht 1)")

NEW_GLOBALS = """  - id: recipe_list_tab
    # 0 = Eerder toegevoegd (cart), 1 = Favorieten, 2 = Eigen recepten
    type: int
    restore_value: yes
    initial_value: '0'
  - id: recipe_list_page
    type: int
    restore_value: no
    initial_value: '0'
  - id: recipe_list_pages
    type: int
    restore_value: no
    initial_value: '1'
  - id: recipe_list_loaded_key
    type: std::string
    restore_value: no
    initial_value: '""'
  - id: recipe_list_ids
    type: std::vector<std::string>
    restore_value: no
    initial_value: 'std::vector<std::string>(10)'
  - id: recipe_list_recheck_allowed
    type: bool
    restore_value: no
    initial_value: 'false'
  - id: recipe_back_from_detail
    type: bool
    restore_value: no
    initial_value: 'false'
  - id: recipe_sheet_pending
    type: bool
    restore_value: no
    initial_value: 'false'
  - id: recipe_sheet_desired_url
    type: std::string
    restore_value: no
    initial_value: '""'
"""
replace_once(
    "  - id: recipe_list_page_active\n    type: bool\n    restore_value: no\n    initial_value: 'false'\n",
    "  - id: recipe_list_page_active\n    type: bool\n    restore_value: no\n    initial_value: 'false'\n"
    + NEW_GLOBALS,
)

# 2. text_sensor: ha_ah_favorites (ongebruikt), ha_recipe_tab en de 96 slotsensoren.
cut_between(
    "  - platform: homeassistant\n    id: ha_ah_favorites\n",
    "\nbinary_sensor:\n",
    "",
)

# 3. artwork_image: 24 thumbnails eruit, één verzamelplaatje erin.
IMGS = ", ".join(f"id(img_recept_{n})" for n in range(1, 11))
RECIPE_SHEET = f"""  # Eén plaatje per receptenpagina: 10 thumbnails van 96x72 onder elkaar.
  # Losse thumbnail-loads gaven per load kans op een blauwe flits; één load per
  # pagina met software-decode flitste niet (gemeten op het paneel, 2026-09-29).
  - id: recipe_sheet
    url: "http://192.168.1.237:3002/api/display/recipes/sheet"
    format: JPEG
    type: RGB565
    byte_order: LITTLE_ENDIAN
    resize: 96x720
    hardware_acceleration: false
    allow_insecure_local_urls: true
    update_interval: never
    on_download_finished:
      - lambda: |-
          id(artwork_busy) = false;
          // Intussen verder gebladerd: dit plaatje hoort niet meer bij de kaarten.
          if (id(recipe_sheet)->get_url() != id(recipe_sheet_desired_url)) return;
          static lv_obj_t *const imgs[10] = {{{IMGS}}};
          for (int i = 0; i < 10; i++) {{
            lv_image_set_src(imgs[i], id(recipe_sheet)->get_lv_image_dsc());
            lv_image_set_inner_align(imgs[i], LV_IMAGE_ALIGN_TOP_LEFT);
            lv_image_set_offset_y(imgs[i], -72 * i);
            if (!id(recipe_list_ids)[i].empty()) lv_obj_clear_flag(imgs[i], LV_OBJ_FLAG_HIDDEN);
          }}
    on_error:
      - lambda: |-
          id(artwork_busy) = false;
          // Volgende keer openen/bladeren opnieuw proberen.
          id(recipe_list_loaded_key).clear();
      - logger.log: "Receptenplaatje laad fout"
"""
cut_between("  - id: recipe_thumb_1\n", "# Let op: recipe_header_art", RECIPE_SHEET)

# 4. interval: thumbnail-dispatcher en HA-tekstbatching eruit, plaatjes-dispatcher erin.
SHEET_DISPATCHER = """  # Receptenplaatje laden zodra de pagina zichtbaar is en geen andere
  # artwork-decode loopt (globale artwork_busy-vergrendeling).
  - interval: 100ms
    then:
      - lambda: |-
          if (!id(recipe_sheet_pending) || !id(recipe_list_page_active) || id(artwork_busy)) return;
          id(recipe_sheet_pending) = false;
          id(artwork_busy) = true;
          id(recipe_sheet)->set_url(id(recipe_sheet_desired_url));
          id(recipe_sheet)->update();

"""
cut_between(
    "  # Recipe thumbnails één voor één downloaden",
    "  # Immich overlay timeout",
    SHEET_DISPATCHER,
)


# 5. De receptenpagina zelf.
def card(n: int) -> str:
    i = n - 1
    x = 32 if i % 2 == 0 else 528
    y = 74 + (i // 2) * 96
    return f"""              - button:
                  id: btn_recept_{n}
                  x: {x}
                  y: {y}
                  width: 464
                  height: 86
                  radius: 8
                  bg_color: 0x15151F
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x28283A
                  pad_all: 0
                  scrollable: false
                  hidden: true
                  on_click:
                    - if:
                        condition:
                          lambda: 'return !id(last_touch_was_swipe) && !id(recipe_list_ids)[{i}].empty();'
                        then:
                          - lambda: 'id(ah_current_step) = 0; id(ah_current_recipe_id) = id(recipe_list_ids)[{i}]; id(ah_recipe_page_active) = true; id(recipe_list_page_active) = false; id(nav_overlay_countdown) = 0;'
                          - lvgl.widget.hide: nav_rail_container
                          - lvgl.widget.hide: top_status_bar
                          - lvgl.widget.show: lbl_recipe_loading
                          - lvgl.page.show: page_recipe_detail
                          - script.execute: recipe_load_current
                  widgets:
                    - image:
                        id: img_recept_{n}
                        x: 8
                        y: 7
                        width: 96
                        height: 72
                        src: recipe_sheet
                        hidden: true
                    - label:
                        id: lbl_recept_{n}_title
                        x: 122
                        y: 14
                        width: 320
                        text_font: font_roboto_16
                        text_color: 0xF2F2F2
                        long_mode: DOT
                        text: ""
                    - label:
                        id: lbl_recept_{n}_meta
                        x: 122
                        y: 48
                        width: 240
                        text_font: font_roboto_16
                        text_color: 0xA0A0A0
                        long_mode: DOT
                        text: ""
"""


def tab(button_id: str, x: int, width: int, text: str, index: int, active: bool) -> str:
    bg = "0xFF9020" if active else "0x15151F"
    border = "0xFF9020" if active else "0x28283A"
    return f"""              - button:
                  id: {button_id}
                  x: {x}
                  y: 18
                  width: {width}
                  height: 42
                  radius: 8
                  bg_color: {bg}
                  bg_opa: COVER
                  border_width: 1
                  border_color: {border}
                  pad_all: 0
                  on_click:
                    - if:
                        condition:
                          lambda: 'return !id(last_touch_was_swipe);'
                        then:
                          - script.execute: nav_overlay_show
                          - script.execute:
                              id: recipe_list_select_tab
                              tab: {index}
                  widgets:
                    - label:
                        align: CENTER
                        text_font: font_roboto_16
                        text_color: 0xFFFFFF
                        text: "{text}"
"""


def pager(button_id: str, label_id: str, x: int, text: str, delta: int) -> str:
    return f"""              - button:
                  id: {button_id}
                  x: {x}
                  y: 556
                  width: 200
                  height: 40
                  radius: 8
                  bg_color: 0x15151F
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x28283A
                  pad_all: 0
                  on_click:
                    - script.execute:
                        id: recipe_list_step
                        delta: {delta}
                  widgets:
                    - label:
                        id: {label_id}
                        align: CENTER
                        text_font: font_roboto_16
                        text_color: 0x555566
                        text: "{text}"
"""


PAGE = (
    """    # ===========================================================
    # PAGINA 6: AH RECEPTEN — 10 per pagina uit recipe-hub
    # ===========================================================
    - id: page_recepten
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        - obj:
            x: 0
            y: 0
            width: 1024
            height: 600
            bg_color: 0x000000
            bg_opa: COVER
            border_width: 0
            pad_all: 0
            scrollable: false
            on_click:
              - if:
                  condition:
                    lambda: 'return !id(last_touch_was_swipe);'
                  then:
                    - script.execute: nav_overlay_show
            widgets:
              - label:
                  x: 32
                  y: 22
                  text_font: font_roboto_28
                  text_color: 0xFFFFFF
                  text: "Recepten"
              - label:
                  id: lbl_recipe_count
                  x: 190
                  y: 30
                  width: 160
                  long_mode: DOT
                  text_font: font_roboto_16
                  text_color: 0xFF9020
                  text: ""
"""
    + tab("btn_recipe_tab_cart", 360, 232, "Eerder toegevoegd", 0, True)
    + tab("btn_recipe_tab_favorites", 604, 168, "Favorieten", 1, False)
    + tab("btn_recipe_tab_custom", 784, 168, "Eigen", 2, False)
    + "".join(card(n) for n in range(1, 11))
    + pager("btn_recipe_prev", "lbl_recipe_prev", 32, "‹  Vorige", -1)
    + """              - label:
                  id: lbl_recipe_page
                  x: 262
                  y: 566
                  width: 500
                  text_align: CENTER
                  text_font: font_roboto_16
                  text_color: 0xA0A0A0
                  text: ""
"""
    + pager("btn_recipe_next", "lbl_recipe_next", 792, "Volgende  ›", 1)
    + "\n\n"
)
cut_between(
    "    # ===========================================================\n    # PAGINA 6: AH RECEPTEN",
    "    # ===========================================================\n    # PAGINA 7: KEUKENTIMER",
    PAGE,
)

# 6. goto_page: openen = pagina 1 van de laatst gekozen tab; terug uit detail = niets herladen.
replace_once(
    """      - if:
          condition:
            lambda: 'return page_index == 5;'
          then:
            - lvgl.page.show: page_recepten
""",
    """      - if:
          condition:
            lambda: 'return page_index == 5;'
          then:
            - lvgl.page.show: page_recepten
            - if:
                condition:
                  lambda: 'return id(recipe_back_from_detail);'
                then:
                  - lambda: 'id(recipe_back_from_detail) = false;'
                else:
                  - lambda: 'id(recipe_list_page) = 0; id(recipe_list_recheck_allowed) = true;'
                  - script.execute: recipe_tab_colors
                  - script.execute: recipe_list_load
""",
)

# 7. Terug-knop in het detail.
replace_once(
    """            on_click:
              then:
                - script.execute:
                    id: goto_page
                    page_index: 5
""",
    """            on_click:
              then:
                - lambda: 'id(recipe_back_from_detail) = true;'
                - script.execute:
                    id: goto_page
                    page_index: 5
""",
)

# 8. Swipe midden op de receptenpagina bladert; de randen houden hun functie.
replace_once(
    "          if (abs_dx >= 55 && abs_dx > abs_dy) {\n",
    """          if (horizontal_swipe && id(recipe_list_page_active) && !id(spotify_drawer_open) &&
              !from_left_edge && !from_right_edge) {
            id(recipe_list_step)->execute(swipe_left ? 1 : -1);
            return;
          }
          if (abs_dx >= 55 && abs_dx > abs_dy) {
""",
)

# 9. Scripts voor laden, bladeren en tabs.
CARDS = ", ".join(f"id(btn_recept_{n})" for n in range(1, 11))
TITLES = ", ".join(f"id(lbl_recept_{n}_title)" for n in range(1, 11))
METAS = ", ".join(f"id(lbl_recept_{n}_meta)" for n in range(1, 11))
SCRIPTS = f"""  - id: recipe_tab_colors
    then:
      - lambda: |-
          static lv_obj_t *const tabs[3] = {{id(btn_recipe_tab_cart), id(btn_recipe_tab_favorites), id(btn_recipe_tab_custom)}};
          for (int i = 0; i < 3; i++) {{
            const bool active = (i == id(recipe_list_tab));
            lv_obj_set_style_bg_color(tabs[i], lv_color_hex(active ? 0xFF9020 : 0x15151F), LV_PART_MAIN);
            lv_obj_set_style_border_color(tabs[i], lv_color_hex(active ? 0xFF9020 : 0x28283A), LV_PART_MAIN);
          }}

  - id: recipe_list_select_tab
    parameters:
      tab: int
    then:
      - lambda: 'id(recipe_list_tab) = tab; id(recipe_list_page) = 0; id(recipe_list_recheck_allowed) = true;'
      - script.execute: recipe_tab_colors
      - script.execute: recipe_list_load

  - id: recipe_list_step
    parameters:
      delta: int
    then:
      - if:
          condition:
            lambda: |-
              const int next = id(recipe_list_page) + delta;
              return next >= 0 && next < id(recipe_list_pages);
          then:
            - lambda: 'id(recipe_list_page) += delta;'
            - script.execute: recipe_list_load

  # recipe-hub ververst "Eerder toegevoegd" op de achtergrond; één keer
  # opnieuw vragen haalt een net in de AH-app gekozen recept binnen.
  - id: recipe_list_recheck
    mode: restart
    then:
      - delay: 5s
      - if:
          condition:
            lambda: 'return id(recipe_list_page_active) && id(recipe_list_page) == 0;'
          then:
            - script.execute: recipe_list_load

  # restart: snel doorbladeren laadt alleen de laatst gekozen pagina.
  - id: recipe_list_load
    mode: restart
    then:
      - http_request.get:
          url: !lambda |-
            static const char *const lists[3] = {{"cart", "favorites", "custom"}};
            const int tab = (id(recipe_list_tab) >= 0 && id(recipe_list_tab) <= 2) ? id(recipe_list_tab) : 0;
            char url[128];
            snprintf(url, sizeof(url), "http://192.168.1.237:3002/api/display/recipes?list=%s&page=%d",
                     lists[tab], id(recipe_list_page));
            return std::string(url);
          capture_response: true
          max_response_buffer_size: 8kB
          on_response:
            then:
              - lambda: |-
                  if (response->status_code != 200) {{
                    ESP_LOGW("recipe_list", "lijst ophalen mislukt: %d", response->status_code);
                    lv_label_set_text(id(lbl_recipe_count), "Niet bereikbaar");
                    return;
                  }}
                  static lv_obj_t *const cards[10] = {{{CARDS}}};
                  static lv_obj_t *const titles[10] = {{{TITLES}}};
                  static lv_obj_t *const metas[10] = {{{METAS}}};
                  static lv_obj_t *const imgs[10] = {{{IMGS}}};
                  static const char *const lists[3] = {{"cart", "favorites", "custom"}};
                  bool refreshing = false;
                  const bool ok = json::parse_json(body, [&](JsonObject root) -> bool {{
                    const int page = root["page"] | 0;
                    const int pages = root["pages"] | 1;
                    const int total = root["total"] | 0;
                    const std::string version = root["version"] | "";
                    refreshing = root["refreshing"] | false;
                    const int tab = (id(recipe_list_tab) >= 0 && id(recipe_list_tab) <= 2) ? id(recipe_list_tab) : 0;

                    id(recipe_list_page) = page;
                    id(recipe_list_pages) = pages < 1 ? 1 : pages;
                    char buf[48];
                    snprintf(buf, sizeof(buf), "%d recepten", total);
                    lv_label_set_text(id(lbl_recipe_count), buf);
                    snprintf(buf, sizeof(buf), "Pagina %d van %d", page + 1, id(recipe_list_pages));
                    lv_label_set_text(id(lbl_recipe_page), buf);
                    lv_obj_set_style_text_color(id(lbl_recipe_prev),
                        lv_color_hex(page > 0 ? 0xFFFFFF : 0x555566), LV_PART_MAIN);
                    lv_obj_set_style_text_color(id(lbl_recipe_next),
                        lv_color_hex(page + 1 < id(recipe_list_pages) ? 0xFFFFFF : 0x555566), LV_PART_MAIN);

                    // Ongewijzigde pagina (zelfde tab, pagina en versie): niets hertekenen.
                    char key[64];
                    snprintf(key, sizeof(key), "%d:%d:%s", tab, page, version.c_str());
                    if (id(recipe_list_loaded_key) == key) return true;
                    id(recipe_list_loaded_key) = key;

                    JsonArray recipes = root["recipes"].as<JsonArray>();
                    for (int i = 0; i < 10; i++) {{
                      lv_obj_add_flag(imgs[i], LV_OBJ_FLAG_HIDDEN);
                      if (i < (int) recipes.size()) {{
                        JsonObject recipe = recipes[i];
                        id(recipe_list_ids)[i] = recipe["id"] | "";
                        lv_label_set_text(titles[i], recipe["title"] | "");
                        snprintf(buf, sizeof(buf), "%d min  \\xc2\\xb7  %d p",
                                 (int) (recipe["duration"] | 0), (int) (recipe["servings"] | 0));
                        lv_label_set_text(metas[i], buf);
                        lv_obj_clear_flag(cards[i], LV_OBJ_FLAG_HIDDEN);
                      }} else {{
                        id(recipe_list_ids)[i].clear();
                        lv_obj_add_flag(cards[i], LV_OBJ_FLAG_HIDDEN);
                      }}
                    }}

                    char url[160];
                    snprintf(url, sizeof(url),
                             "http://192.168.1.237:3002/api/display/recipes/sheet?list=%s&page=%d&v=%s",
                             lists[tab], page, version.c_str());
                    id(recipe_sheet_desired_url) = url;
                    id(recipe_sheet_pending) = true;
                    return true;
                  }});
                  if (!ok) {{
                    lv_label_set_text(id(lbl_recipe_count), "Niet bereikbaar");
                    return;
                  }}
                  if (refreshing && id(recipe_list_page) == 0 && id(recipe_list_recheck_allowed)) {{
                    id(recipe_list_recheck_allowed) = false;
                    id(recipe_list_recheck).execute();
                  }}
          on_error:
            then:
              - lambda: |-
                  ESP_LOGW("recipe_list", "recipe-hub niet bereikbaar");
                  lv_label_set_text(id(lbl_recipe_count), "Niet bereikbaar");

"""
replace_once("  - id: recipe_load_current\n", SCRIPTS + "  - id: recipe_load_current\n")

YAML.write_text(s)
print(f"OK: {YAML} gemigreerd")
