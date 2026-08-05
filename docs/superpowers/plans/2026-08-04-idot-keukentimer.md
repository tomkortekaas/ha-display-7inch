# iDot Keukentimer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one kitchen timer to the 7-inch LVGL display that controls the native iDot countdown and repeats the Reolink chime until the user acknowledges it on the display.

**Architecture:** ESPHome renders a seventh Timer page and sends commands over its existing native Home Assistant API. Home Assistant owns the `idle`/`running`/`paused`/`alarming` state machine, timer, iDot override, and cancellable chime loop; ESPHome only mirrors state and remaining time.

**Tech Stack:** ESPHome YAML, LVGL, Home Assistant package YAML, iDotMatrix custom component, Reolink integration, POSIX shell structural tests.

## Global Constraints

- Support exactly one timer at a time.
- Offer fixed choices of 5, 10, 15, and 20 minutes plus whole-minute numeric input.
- Expose Pause/Resume, +1 minute, Stop, and Alarm off controls.
- Keep `00:00` on iDot and repeat the Reolink chime while status is `alarming`.
- Only **Alarm uit** may end `alarming`; normal iDot rotation resumes afterward.
- Keep every LVGL touch target at least 44 pixels high.
- Do not modify Recipe Hub or Photo Swipe server code.
- Never expose a Home Assistant token on the display.

---

### Task 1: Native iDot Countdown Service

**Files:**
- Create: `home-assistant/idotmatrix-countdown/coordinator.py.fragment`
- Create: `home-assistant/idotmatrix-countdown/__init__.py.fragment`
- Create: `home-assistant/idotmatrix-countdown/services.yaml.fragment`
- Create: `tests/check_idot_countdown_patch.sh`

**Interfaces:**
- Consumes: installed custom component at `/config/custom_components/idotmatrix` and its `Countdown.setMode(mode, minutes, seconds)` client module.
- Produces: Home Assistant service `idotmatrix.set_countdown` with integer fields `mode`, `minutes`, and `seconds`; modes are `0=disable`, `1=start`, `2=pause`, `3=restart`.

- [ ] **Step 1: Write the failing fragment test**

Create `tests/check_idot_countdown_patch.sh` with assertions that the coordinator fragment imports `Countdown` and calls `await countdown.setMode(mode, minutes, seconds)`, the init fragment registers `set_countdown`, and the service schema restricts mode to 0–3, minutes to 0–99, and seconds to 0–59.

Run: `bash tests/check_idot_countdown_patch.sh`

Expected: FAIL because the three fragments do not exist.

- [ ] **Step 2: Add the exact coordinator fragment**

```python
from .client.modules.countdown import Countdown

async def async_set_countdown(self, mode: int, minutes: int, seconds: int) -> None:
    """Send a native countdown command to the display."""
    countdown = Countdown()
    countdown.conn = self.conn
    await countdown.setMode(mode, minutes, seconds)
```

- [ ] **Step 3: Add the exact registration fragment**

```python
async def async_set_countdown(call):
    mode = int(call.data["mode"])
    minutes = int(call.data.get("minutes", 0))
    seconds = int(call.data.get("seconds", 0))
    for entry_id in hass.data[DOMAIN]:
        await hass.data[DOMAIN][entry_id].async_set_countdown(mode, minutes, seconds)

hass.services.async_register(DOMAIN, "set_countdown", async_set_countdown)
```

- [ ] **Step 4: Add the services schema**

Define `set_countdown` with required numeric selectors: `mode` 0–3, `minutes` 0–99, and `seconds` 0–59, all in box mode.

- [ ] **Step 5: Run the fragment test**

Run: `bash tests/check_idot_countdown_patch.sh`

Expected: PASS.

- [ ] **Step 6: Install and verify on Home Assistant**

Insert—not overwrite—the fragments into:

```text
/config/custom_components/idotmatrix/coordinator.py
/config/custom_components/idotmatrix/__init__.py
/config/custom_components/idotmatrix/services.yaml
```

Restart Home Assistant, then query the iDotMatrix services. Expected: `set_countdown` appears with all three fields. Call it once with `{mode: 1, minutes: 0, seconds: 10}`, then with `{mode: 0, minutes: 0, seconds: 0}`; expected: the display counts down and then exits countdown mode.

- [ ] **Step 7: Commit**

```bash
git add home-assistant/idotmatrix-countdown tests/check_idot_countdown_patch.sh
git commit -m "feat: document native iDot countdown service patch"
```

---

### Task 2: Home Assistant Timer State Machine

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`
- Create: `tests/check_idot_kitchen_timer_package.sh`

**Interfaces:**
- Consumes: `idotmatrix.set_countdown`, `input_boolean.idotmatrix_actief`, `automation.idot_rotatie`, and Reolink chime device `271cbe4bff5083fb97aabac7f63f9f66`.
- Produces: `input_select.idotmatrix_timer_status`, `input_number.idotmatrix_timer_minuten`, `timer.idotmatrix_timer`, and scripts `script.idotmatrix_timer_start`, `pause`, `resume`, `add_minute`, `stop`, and `acknowledge`.

- [ ] **Step 1: Write the failing package regression test**

The shell test must require:

```text
status options: idle, running, paused, alarming
minutes range: 0..99, step 1
timer restore: false
six named scripts
timer.finished automation
alarm loop guarded by status == alarming
Reolink device id 271cbe4bff5083fb97aabac7f63f9f66
```

Run: `bash tests/check_idot_kitchen_timer_package.sh`

Expected: FAIL because the package has no kitchen timer section.

- [ ] **Step 2: Add helpers**

Add YAML helpers with these exact identities and options:

```yaml
input_select:
  idotmatrix_timer_status:
    name: iDotMatrix timer status
    options: [idle, running, paused, alarming]
    initial: idle
input_number:
  idotmatrix_timer_minuten:
    name: iDotMatrix timer minuten
    min: 0
    max: 99
    step: 1
    mode: box
timer:
  idotmatrix_timer:
    name: iDotMatrix timer
    duration: "00:05:00"
    restore: false
```

Before deploying, remove or rename the existing storage-backed helpers with the same entity IDs so the YAML package remains the single source of truth.

- [ ] **Step 3: Add start, pause, and resume scripts**

`idotmatrix_timer_start` accepts integer field `minutes`, rejects values outside 1–99, stops `input_boolean.idotmatrix_actief`, clears the current face, waits one second, calls native mode 1, starts the HA timer with `00:MM:00`, stores the minutes, and selects `running`.

`idotmatrix_timer_pause` requires `running`, calls `timer.pause`, calls native mode 2 with zeroed time fields, then selects `paused`.

`idotmatrix_timer_resume` requires `paused`, derives remaining whole minutes and seconds from `state_attr('timer.idotmatrix_timer', 'remaining')`, calls native mode 3 with those values, calls `timer.start` without replacing the remaining duration, then selects `running`.

- [ ] **Step 4: Add +1 minute, stop, and acknowledge scripts**

`idotmatrix_timer_add_minute` works only in `running` or `paused`, parses the timer's `remaining` attribute into seconds, adds 60 capped at 5,940 seconds, restarts the HA timer with the new duration, and sends native mode 3. If originally paused, pause both timers again and retain `paused`.

`idotmatrix_timer_stop` works only in `running` or `paused`: cancel HA timer, send native mode 0, reset minutes and status, then safely resume rotation by turning the rotation automation on followed by `input_boolean.idotmatrix_actief` after its existing 1.5-second settling delay.

`idotmatrix_timer_acknowledge` works only in `alarming`: select `idle` first so the guarded gong loop exits, send native mode 0, reset minutes, and resume rotation. It must not be called by the normal Stop control.

- [ ] **Step 5: Replace the existing four cube timer automations**

Delete `automation.idot_timer_kubus_draaien`, `automation.idot_timer_start`, `automation.idot_timer_annuleren`, and `automation.idot_timer_afgelopen` after the new scripts are loaded. Add one package automation triggered by `timer.finished` for `timer.idotmatrix_timer`; it selects `alarming` and leaves native iDot at `00:00`.

Add one `mode: restart` alarm automation triggered when status becomes `alarming`. Its repeat sequence first checks that status is still `alarming`, calls `reolink.play_chime` on device `271cbe4bff5083fb97aabac7f63f9f66` with ringtone `goodday`, waits three seconds, and repeats while the status remains `alarming`.

- [ ] **Step 6: Validate and test the package**

Run:

```bash
bash tests/check_idot_kitchen_timer_package.sh
git diff --check
```

Expected: PASS and no whitespace errors. Deploy the package, reload helpers/scripts/automations, and render a template that confirms all four status options and all six scripts exist.

- [ ] **Step 7: Commit**

```bash
git add home-assistant/ha-display-7-package.yaml tests/check_idot_kitchen_timer_package.sh
git commit -m "feat: add Home Assistant iDot kitchen timer state machine"
```

---

### Task 3: ESPHome Timer State Bindings And Commands

**Files:**
- Modify: `esphome/ha-display-7.yaml`
- Create: `tests/check_idot_timer_bindings.sh`

**Interfaces:**
- Consumes: the helpers and six scripts from Task 2.
- Produces: internal ESPHome IDs `ha_idot_timer_status`, `ha_idot_timer_remaining`, `timer_input_minutes`, and scripts that call the six HA scripts.

- [ ] **Step 1: Write failing structural assertions**

Require both Home Assistant bindings, a restored integer input global initialized to zero, and six `homeassistant.action` calls targeting the exact script entity IDs from Task 2.

Run: `bash tests/check_idot_timer_bindings.sh`

Expected: FAIL.

- [ ] **Step 2: Add state bindings**

Add a Home Assistant text sensor for `input_select.idotmatrix_timer_status` and a Home Assistant sensor for `timer.idotmatrix_timer` attribute `remaining`. Their update handlers call a single `timer_ui_refresh` script. Treat `unknown`, `unavailable`, or an unparseable duration as zero without changing Home Assistant state.

- [ ] **Step 3: Add local input state and commands**

Add `timer_input_minutes` as an integer global, clamp it to 0–99, and add focused ESPHome scripts:

```text
timer_digit_append(digit)
timer_input_clear
timer_start_command
timer_pause_resume_command
timer_add_minute_command
timer_stop_command
timer_acknowledge_command
timer_ui_refresh
```

`timer_start_command` must do nothing at zero and otherwise call `script.idotmatrix_timer_start` with `minutes` from the global. Other command scripts call their exact Home Assistant counterparts without duplicating state-machine logic locally.

- [ ] **Step 4: Run tests and commit**

Run: `bash tests/check_idot_timer_bindings.sh && git diff --check`

Expected: PASS.

```bash
git add esphome/ha-display-7.yaml tests/check_idot_timer_bindings.sh
git commit -m "feat: bind kitchen timer state to ESPHome"
```

---

### Task 4: Timer Navigation Tile And LVGL Page

**Files:**
- Modify: `esphome/ha-display-7.yaml`
- Create: `tests/check_idot_timer_page.sh`

**Interfaces:**
- Consumes: timer globals, state bindings, and command scripts from Task 3.
- Produces: `nav_timer`, `nav_strip_timer`, `page_timer`, timer labels, preset/digit controls, running controls, and `btn_timer_alarm_off`.

- [ ] **Step 1: Write the failing page test**

Require seven navigation buttons and strips, `page_index: 6`, `page_timer`, preset buttons 5/10/15/20, digit buttons 0–9, Start, Pause/Resume, +1 minute, Stop, and Alarm off. Assert every button height is at least 44 and `nav_select` arrays have length seven.

Run: `bash tests/check_idot_timer_page.sh`

Expected: FAIL.

- [ ] **Step 2: Compact the navigation rail and add Timer**

Keep the logo at `y: 12`. Place the seven 64-pixel nav rows at `y: 64, 136, 208, 280, 352, 424, 496`; retain their 56×56 buttons. Move Recepten to row six and put Timer directly below it with IDs `nav_timer` and `nav_strip_timer`, green accent `0x2EE36A`, and a clock glyph from the already bundled Material Design icon font.

Extend `nav_select` colors, strips, and buttons arrays from six to seven. Extend `goto_page` so index 6 shows `page_timer`.

- [ ] **Step 3: Add the idle/running timer page**

Create `page_timer` with the existing black/card styling. Include a large tabular `MM:SS` label, preset row 5/10/15/20, a 3×4 numeric keypad (1–9, clear, 0, backspace), and **Start op iDot**. Add the running controls Pause/Resume, +1 minuut, and Stoppen. `timer_ui_refresh` shows only the controls appropriate for `idle`, `running`, or `paused`.

- [ ] **Step 4: Add the alarm presentation**

When status is `alarming`, hide all normal controls, show `00:00`, show a high-contrast alarm card, and show one large `btn_timer_alarm_off` labelled **ALARM UIT**. Its click handler calls only `timer_acknowledge_command`.

- [ ] **Step 5: Test and commit**

Run:

```bash
bash tests/check_idot_timer_page.sh
for test_file in tests/*.sh; do bash "$test_file" || exit 1; done
git diff --check
```

Expected: all tests PASS.

```bash
git add esphome/ha-display-7.yaml tests/check_idot_timer_page.sh
git commit -m "feat: add timer tile and LVGL timer page"
```

---

### Task 5: Validation, OTA, And End-to-End Test

**Files:**
- Verify: `esphome/ha-display-7.yaml`
- Verify: `home-assistant/ha-display-7-package.yaml`
- Modify: `deploy-to-ha.sh`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: deployed Home Assistant configuration and timer-capable display firmware.

- [ ] **Step 1: Extend deployment coverage**

Update `deploy-to-ha.sh` so it copies the timer package source already contained in `ha-display-7-package.yaml`, but does not attempt to overwrite custom-component Python automatically. Print an explicit preflight failure if `idotmatrix.set_countdown` is absent before offering ESPHome OTA.

- [ ] **Step 2: Validate Home Assistant and ESPHome**

Run Home Assistant configuration validation. Run the repository's configured ESPHome validation command for `esphome/ha-display-7.yaml`. Expected: both valid with no missing IDs, actions, fonts, or services.

- [ ] **Step 3: Run the complete regression suite**

Run: `for test_file in tests/*.sh; do bash "$test_file" || exit 1; done`

Expected: every test prints PASS and exits zero.

- [ ] **Step 4: Deploy package and flash OTA**

Deploy the package, reload Home Assistant, then flash the validated ESPHome firmware OTA. Verify the display reconnects and all timer entities are available rather than `unknown` or `unavailable`.

- [ ] **Step 5: Execute the end-to-end checklist**

1. Open the nav rail; verify Timer sits directly below Recepten.
2. Start each preset once, stopping between checks.
3. Enter `12` numerically and verify both displays count from 12:00.
4. Pause for five seconds; verify both displays remain unchanged, then resume.
5. Add one minute and verify both displays increase by 60 seconds.
6. Stop; verify no gong and normal iDot rotation resumes.
7. Start a one-minute timer and leave the Timer page; return and verify state is retained.
8. Let it finish; verify iDot stays at `00:00` and the gong repeats every three seconds.
9. Wait for at least three gong cycles, press **ALARM UIT**, and verify the next gong does not play and iDot rotation resumes.

- [ ] **Step 6: Commit deployment changes**

```bash
git add deploy-to-ha.sh
git commit -m "chore: deploy and verify iDot kitchen timer"
```

---

### Task 6: Seconds-Aware Home Assistant Timer And iDot Resync

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`
- Modify: `tests/check_idot_kitchen_timer_package.sh`

**Interfaces:**
- Consumes: the live `idotmatrix.set_countdown(mode, minutes, seconds)` service and existing timer state machine.
- Produces: `script.idotmatrix_timer_start` fields `minutes: int` and `seconds: int`, valid total duration 1–5,999 seconds, and a +1 action that sends a fresh native countdown start.

- [ ] **Step 1: Add failing node-scoped YAML tests**

Require the Start script to accept both fields, normalize total seconds, reject `00:00`, and send matching minutes/seconds to both `timer.start` and `idotmatrix.set_countdown`. Require Add Minute to calculate against `finishes_at` while running, use fixed `remaining` while paused, add exactly 60 seconds, and send native `mode: 1` rather than `mode: 3`.

Run: `bash tests/check_idot_kitchen_timer_package.sh`

Expected: FAIL because Start has no seconds field and Add Minute uses stale `remaining` plus native mode 3.

- [ ] **Step 2: Make Start seconds-aware**

Add optional integer field `seconds` defaulting to zero. Calculate `total_seconds = minutes * 60 + seconds`, require `1 <= total_seconds <= 5999`, and derive normalized native minutes/seconds. Start the HA timer with exact `HH:MM:SS` and send native mode 1 with the same duration.

- [ ] **Step 3: Fix Add Minute at the source**

For `running`, calculate current seconds from `finishes_at - now()`; for `paused`, parse `remaining`. Add 60 seconds and cap at 5,999. Restart the HA timer with that duration and send native mode 1 with the normalized duration. If the original status was paused, immediately pause both timers again and keep status `paused`.

- [ ] **Step 4: Validate, deploy, and silently verify**

Run the package test, all shell tests, and `git diff --check`. Deploy the package, run `ha core check`, reload scripts, then silently test a 90-second start and +1 minute; stop well before expiry. Verify HA changes by exactly 60 seconds and ends `idle`. Do not test the gong.

- [ ] **Step 5: Commit**

```bash
git add home-assistant/ha-display-7-package.yaml tests/check_idot_kitchen_timer_package.sh
git commit -m "fix: support seconds and resync extended iDot timers"
```

---

### Task 7: Seconds Input And Live 7-Inch Countdown

**Files:**
- Modify: `esphome/ha-display-7.yaml`
- Modify: `tests/check_idot_timer_bindings.sh`
- Modify: `tests/check_idot_timer_page.sh`

**Interfaces:**
- Consumes: Task 6 Start fields and HA timer attributes `remaining` and `finishes_at`.
- Produces: globals `timer_input_minutes`, `timer_input_seconds`, selected input field, a `finishes_at` binding, and one-second local display refresh.

- [ ] **Step 1: Add failing structural and logic tests**

Require separate 0–99 minutes and 0–59 seconds globals, selectable minute/second field buttons, keypad routing to the selected field, Start payload with both fields, `finishes_at` binding, a one-second refresh interval, explicit unknown/unavailable controls-off behavior, and visible `MM:SS` updates for running and paused states.

Run: `bash tests/check_idot_timer_bindings.sh && bash tests/check_idot_timer_page.sh`

Expected: FAIL.

- [ ] **Step 2: Split idle input into minutes and seconds**

Add `timer_input_seconds` and a selected-field enum/global. Clamp minutes to 0–99 and seconds to 0–59. Presets set minutes and reset seconds to zero. Digit, clear, and backspace actions operate only on the selected field. Render two clearly labelled, tappable fields and visually highlight the selected field.

- [ ] **Step 3: Pass exact duration to Home Assistant**

Update `timer_start_command` to reject only total duration zero and call `script.idotmatrix_timer_start` with both minutes and seconds. After Start and each preset/input change, call the centralized UI refresh.

- [ ] **Step 4: Add a locally ticking display clock**

Bind `timer.idotmatrix_timer` attribute `finishes_at`. While status is `running`, calculate remaining seconds from parsed `finishes_at` minus `id(ha_time).now().timestamp` on a one-second interval. While `paused`, display the fixed parsed `remaining`. New HA attribute/status updates re-anchor the calculation. Unknown/unavailable state hides all action groups and shows only the unavailable message.

- [ ] **Step 5: Strengthen +1 feedback**

On +1 click, optimistically add 60 seconds to the local displayed remaining value, then call the HA script. The next HA update re-anchors it. Do not mutate the HA state machine locally.

- [ ] **Step 6: Validate and commit**

Run all shell tests, ESPHome config validation and full compile, plus `git diff --check`.

```bash
git add esphome/ha-display-7.yaml tests/check_idot_timer_bindings.sh tests/check_idot_timer_page.sh
git commit -m "feat: add seconds input and live timer display"
```

---

### Task 8: OTA And Silent Physical Verification

**Files:**
- Verify: `esphome/ha-display-7.yaml`
- Verify: `home-assistant/ha-display-7-package.yaml`

**Interfaces:**
- Consumes: Tasks 6–7.
- Produces: deployed seconds-aware timer with synchronized iDot and 7-inch displays.

- [ ] **Step 1: Run all gates**

Run the secure deployment preflight, all shell tests, HA config validation, ESPHome validation and compile. Expected: all PASS.

- [ ] **Step 2: Deploy and flash OTA**

Deploy only changed package/YAML artifacts, reload Home Assistant scripts, flash `ha-display-7.local`, and verify reconnect.

- [ ] **Step 3: Perform silent physical checks**

1. Enter `00:10`; verify both displays visibly count every second, then stop before zero.
2. Enter `01:30`; verify both displays start at 01:30.
3. Press +1; verify both displays jump to approximately 02:30 and continue counting.
4. Pause for five seconds; verify both displays remain fixed, then resume.
5. Leave and return to Timer; verify the live time remains synchronized.
6. Stop and verify status `idle` and normal iDot rotation resumed.

The already-confirmed gong/alarm behavior is unchanged and is not repeated during quiet hours.
