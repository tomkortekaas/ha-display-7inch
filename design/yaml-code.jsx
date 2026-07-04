// ESPHome YAML viewer + content
// This is a starter YAML config for a 7" 1024x600 ESP32-S3 display running LVGL,
// pulling from Home Assistant via api: + homeassistant.* values.

const ESPHOME_YAML = `# ---------------------------------------------------------------------
# ESPHome configuration for 7" 1024x600 RGB display
# Board: ESP32-S3-Touch-LCD-7 (or compatible RGB parallel display)
# Renders 5 screens from Home Assistant entities via LVGL.
# ---------------------------------------------------------------------

substitutions:
  device_name: ha-display-7
  friendly: "HA Display 7\\""
  # ---- Accent colors (match dashboard design) ----
  c_power:  "0x8A4DFF"   # purple
  c_water:  "0x34D0FF"   # cyan
  c_gas:    "0xFF2A7A"   # pink
  c_solar:  "0x2EE36A"   # green
  c_heat:   "0xFF8A3A"   # orange
  c_bg:     "0x000000"
  c_ink:    "0xFFFFFF"
  c_dim:    "0x8A8A93"

esphome:
  name: \${device_name}
  friendly_name: \${friendly}

esp32:
  board: esp32-s3-devkitc-1
  variant: esp32s3
  framework:
    type: esp-idf

psram:
  mode: octal
  speed: 80MHz

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

api:
  encryption:
    key: !secret api_key

ota:
  - platform: esphome

logger:
  level: INFO

# ---------------- Display (RGB parallel) ----------------
display:
  - platform: rpi_dpi_rgb
    id: main_display
    update_interval: never
    auto_clear_enabled: false
    color_order: rgb
    pclk_frequency: 16MHz
    dimensions:
      width: 1024
      height: 600
    # Pin assignments depend on your board — see board docs.

touchscreen:
  - platform: gt911
    id: main_touch
    display: main_display
    transform:
      mirror_x: false
      mirror_y: false

# ---------------- Time + Weather sources ----------------
time:
  - platform: homeassistant
    id: ha_time

# ---------------- Sensors from Home Assistant ----------------
sensor:
  - platform: homeassistant
    id: p1_power
    entity_id: sensor.p1_active_power
  - platform: homeassistant
    id: p1_import_today
    entity_id: sensor.p1_energy_import_today
  - platform: homeassistant
    id: p1_export_today
    entity_id: sensor.p1_energy_export_today
  - platform: homeassistant
    id: solar_today
    entity_id: sensor.solar_yield_today
  - platform: homeassistant
    id: gas_today
    entity_id: sensor.p1_gas_today
  - platform: homeassistant
    id: water_today
    entity_id: sensor.water_meter_today
  - platform: homeassistant
    id: cost_today
    entity_id: sensor.energy_cost_today
  - platform: homeassistant
    id: dynamic_price
    entity_id: sensor.nordpool_kwh_nl_eur
  - platform: homeassistant
    id: indoor_temp
    entity_id: sensor.living_room_temperature
  - platform: homeassistant
    id: outdoor_temp
    entity_id: sensor.outdoor_temperature
  - platform: homeassistant
    id: thermostat_setpoint
    entity_id: climate.living_room
    attribute: temperature

text_sensor:
  - platform: homeassistant
    id: media_track
    entity_id: media_player.spotify_woonkamer
    attribute: media_title
  - platform: homeassistant
    id: media_artist
    entity_id: media_player.spotify_woonkamer
    attribute: media_artist
  - platform: homeassistant
    id: media_state
    entity_id: media_player.spotify_woonkamer
  - platform: homeassistant
    id: weather_condition
    entity_id: weather.knmi_amsterdam

# ---------------- LVGL UI ----------------
lvgl:
  displays: main_display
  touchscreens: main_touch
  theme:
    obj:
      bg_color: \${c_bg}
      text_color: \${c_ink}
      border_width: 0
    label:
      text_font: roboto_24
  top_layer:
    widgets:
      - obj:
          id: status_bar
          x: 88
          y: 0
          width: 936
          height: 56
          bg_color: 0x060608
          widgets:
            - label:
                id: clock_label
                align: LEFT_MID
                x: 24
                text_font: roboto_28_bold
                text: "00:00"
            - label:
                id: date_label
                align: LEFT_MID
                x: 130
                text_color: \${c_dim}
                text: "—"
  pages:
    # ---- Page 1: Energy ----
    - id: page_energy
      widgets:
        - arc:
            id: ring_power
            x: 60
            y: 90
            width: 280
            height: 280
            arc_color: \${c_power}
            indicator:
              arc_color: \${c_power}
              arc_width: 18
            min_value: 0
            max_value: 3500
            value: 350
            widgets:
              - label:
                  align: CENTER
                  text_font: roboto_72_bold
                  text: "350"
              - label:
                  align: CENTER
                  y: 60
                  text_color: \${c_power}
                  text: "W"
        - arc:
            id: ring_water
            x: 420
            y: 80
            width: 160
            height: 160
            arc_color: \${c_water}
            indicator: { arc_color: \${c_water}, arc_width: 12 }
            value: 315
            max_value: 500
            widgets:
              - label: { align: CENTER, text_font: roboto_36_bold, text: "315" }
              - label: { align: CENTER, y: 40, text_color: \${c_water}, text: "L" }
        - arc:
            id: ring_gas
            x: 420
            y: 260
            width: 160
            height: 160
            arc_color: \${c_gas}
            indicator: { arc_color: \${c_gas}, arc_width: 12 }
            value: 8
            max_value: 20
            widgets:
              - label: { align: CENTER, text_font: roboto_36_bold, text: "8.4" }
              - label: { align: CENTER, y: 40, text_color: \${c_gas}, text: "m³" }
        # Right column — bar metrics
        - obj:
            x: 640
            y: 80
            width: 340
            height: 400
            bg_color: 0x0D0D10
            radius: 18
            widgets:
              - label: { x: 18, y: 14, text_color: \${c_dim}, text: "VANDAAG" }
              - label: { x: 60, y: 56, text_font: roboto_36_bold, text: "12" }
              - label: { x: 120, y: 60, text_color: \${c_dim}, text: "€67" }
              - label: { x: 60, y: 160, text_font: roboto_36_bold, text: "18" }
              - label: { x: 120, y: 164, text_color: \${c_dim}, text: "kWh" }

    # ---- Page 2: Climate ---- (see HA: climate.living_room)
    - id: page_climate
      widgets:
        - arc:
            id: ring_thermo
            align: CENTER
            x: -140
            width: 300
            height: 300
            arc_color: \${c_heat}
            indicator: { arc_color: \${c_heat}, arc_width: 20 }
            min_value: 10
            max_value: 28
            value: 21
            on_value:
              then:
                - homeassistant.service:
                    service: climate.set_temperature
                    data:
                      entity_id: climate.living_room
                      temperature: !lambda 'return x;'

    # ---- Page 3: Lights ----
    - id: page_lights
      # Buttons toggle light.* entities
      widgets:
        - button:
            x: 40
            y: 80
            width: 200
            height: 100
            bg_color: 0x14141A
            widgets:
              - label: { align: CENTER, text: "Woonkamer" }
            on_press:
              then:
                - homeassistant.service:
                    service: light.toggle
                    data:
                      entity_id: light.woonkamer

    # ---- Page 4: Spotify ---- (now playing)
    - id: page_spotify
      widgets:
        - label:
            id: track_title
            x: 360
            y: 100
            text_font: roboto_38_bold
            text: !lambda 'return id(media_track).state;'
        - label:
            id: track_artist
            x: 360
            y: 160
            text_color: \${c_dim}
            text: !lambda 'return id(media_artist).state;'
        - button:
            id: play_btn
            align: CENTER
            x: 360
            y: 220
            width: 72
            height: 72
            radius: 36
            bg_color: \${c_ink}
            on_press:
              then:
                - homeassistant.service:
                    service: media_player.media_play_pause
                    data:
                      entity_id: media_player.spotify_woonkamer

    # ---- Page 5: Camera ----
    - id: page_camera
      widgets:
        - image:
            id: cam_feed
            x: 24
            y: 80
            width: 680
            height: 480
            src: !lambda 'return id(cam_voordeur).state.c_str();'
        # NB: live MJPEG over LVGL is limited; many setups update a single-frame
        # snapshot every few seconds via REST + online_image.

# ---------------- Buttons → screen navigation ----------------
button:
  - platform: template
    name: "Show Energy"
    on_press: { then: [lvgl.page.show: page_energy] }
  - platform: template
    name: "Show Climate"
    on_press: { then: [lvgl.page.show: page_climate] }

# ---------------- Backlight & auto-dim ----------------
output:
  - platform: ledc
    pin: GPIO45
    id: backlight_pwm

light:
  - platform: monochromatic
    name: "Display backlight"
    output: backlight_pwm
    restore_mode: ALWAYS_ON

# Auto-dim 'avonds
interval:
  - interval: 60s
    then:
      - if:
          condition:
            lambda: |-
              auto t = id(ha_time).now();
              return t.hour >= 22 || t.hour < 7;
          then:
            - light.turn_on: { id: backlight_pwm, brightness: 20% }
          else:
            - light.turn_on: { id: backlight_pwm, brightness: 90% }
`;

function syntaxHighlight(yaml) {
  return yaml
    .split("\n")
    .map((line, i) => {
      // comment
      if (line.trim().startsWith("#")) {
        return <span key={i} className="c">{line}{"\n"}</span>;
      }
      const m = line.match(/^(\s*-?\s*)([\w_]+)(:\s*)(.*)$/);
      if (m) {
        const [, indent, key, sep, rest] = m;
        let valEl = rest;
        if (/^["'].*["']$/.test(rest)) valEl = <span className="s">{rest}</span>;
        else if (/^\d/.test(rest)) valEl = <span className="n">{rest}</span>;
        else if (/^0x/.test(rest)) valEl = <span className="n">{rest}</span>;
        return (
          <span key={i}>
            {indent}
            <span className="k">{key}</span>
            {sep}
            {valEl}
            {"\n"}
          </span>
        );
      }
      return <span key={i}>{line}{"\n"}</span>;
    });
}

function CodeModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ESPHOME_YAML);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };
  return (
    <div className="code-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="code-panel">
        <div className="code-header">
          <h3>esphome / ha-display-7.yaml</h3>
          <div className="code-actions">
            <button className="code-action" onClick={copy}>{copied ? "✓ Gekopieerd" : "Kopieer"}</button>
            <button className="code-action" onClick={onClose}>Sluiten</button>
          </div>
        </div>
        <div className="code-content">{syntaxHighlight(ESPHOME_YAML)}</div>
      </div>
    </div>
  );
}

window.CodeModal = CodeModal;
window.ESPHOME_YAML = ESPHOME_YAML;
