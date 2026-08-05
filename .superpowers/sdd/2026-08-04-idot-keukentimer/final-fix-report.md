# Final fix wave report

## Implemented

- Added `idotmatrix_timer_startup_reconcile`, triggered by Home Assistant start.
- The reconciliation stops the live alarm automation, selects `idle`, disables the
  native countdown with `continue_on_error`, resets the minute helper, resumes iDot
  rotation/display activity, and re-enables the alarm automation.
- Verified the live alarm entity registry ID read-only as
  `automation.idotmatrix_timer_alarmgong`; no chime/gong service was called.
- Changed Home Assistant deployment to default to `hassio` for both preflight and
  SCP, with `HA_USER` selecting both by default and `HA_SSH_USER` retaining an
  explicit exceptional override.
- Extended tests for startup reconciliation, failure-tolerant native reset,
  correct alarm-loop cancellation order, default `hassio` deployment, and custom
  `HA_USER` reuse by preflight and SCP.

## TDD evidence

- Startup test failed first with `missing idotmatrix_timer_startup_reconcile automation`.
- Deployment test failed first because the package copy still targeted `root@test-ha`.
- The alarm entity-ID assertion was then corrected from the automation unique ID to
  the live entity-registry ID, observed failing before the production target changed.

## Verification

- All six `tests/*.sh` checks pass.
- `git diff --check` passes.
- No ESPHome source was changed, so ESPHome validation/compile was not repeated.
- No deployment, Home Assistant restart, OTA, or audible gong test was performed.

## Deployment needed

Deploy `home-assistant/ha-display-7-package.yaml` to
`/config/packages/ha_display_7.yaml`, run `ha core check`, and restart/reload Home
Assistant so the new startup automation is registered. `deploy-to-ha.sh` itself
also needs to be used from this commit for future deployments. No firmware OTA is
needed for this fix wave.
