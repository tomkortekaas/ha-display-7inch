# HA Display 7 - Home Assistant config

Deze map bevat de Home Assistant-kant voor het 7-inch ESPHome/LVGL display.

## Bestanden

- `ha-display-7-add-to-configuration.yaml`
  Voeg deze blokken samen in `/config/configuration.yaml`.
- `immich_rotate_7inch.py`
  Zet op `/config/www/idotmatrix/immich_rotate_7inch.py`.
- `secrets-immich-example.yaml`
  Vul de echte waarden in `/config/secrets.yaml`.

## Belangrijk

De forecast gebruikt bewust `weather.forecast_thuis`.
`weather.buienradar` gaf op dit HA-systeem geen daily forecast terug.

Immich publiceert deze sensoren:

- `sensor.immich_photo_url`
- `sensor.immich_place`
- `sensor.immich_date`
- `sensor.immich_album`

Het ESPHome-display decodeert de Immich-foto nu niet zelf. Dat is bewust: grote
online images waren instabiel op dit scherm. Eerst metadata stabiel krijgen,
daarna pas gecontroleerd kleine thumbnails testen.

## Na kopieren naar Home Assistant

1. Controleer configuratie in Home Assistant.
2. Herstart Home Assistant volledig.
3. Run eventueel handmatig de service `shell_command.immich_rotate_7inch`.
4. Controleer in Developer Tools -> States of de `sensor.immich_*` en
   `sensor.weerscherm_*` entiteiten gevuld zijn.
