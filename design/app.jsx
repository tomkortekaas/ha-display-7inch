// Root app — manages state, screen routing, status bar, side nav, Tweaks

const SCREENS = [
  { id: "energy", label: "Energie", icon: "bolt", color: "var(--accent-power)" },
  { id: "climate", label: "Klimaat", icon: "thermo", color: "var(--accent-heat)" },
  { id: "lights", label: "Licht", icon: "light", color: "var(--accent-solar)" },
  { id: "spotify", label: "Muziek", icon: "music", color: "var(--accent-gas)" },
  { id: "camera", label: "Camera", icon: "camera", color: "var(--accent-water)" },
  { id: "weather", label: "Weer", icon: "weather", color: "var(--accent-water)" },
];

const PALETTES = {
  vivid: {
    label: "Vivid",
    power: "#8A4DFF", water: "#34D0FF", gas: "#FF2A7A", solar: "#2EE36A", heat: "#FF8A3A", cost: "#FFD84A",
  },
  ocean: {
    label: "Ocean",
    power: "#5B8DEF", water: "#34D0FF", gas: "#FF6B9D", solar: "#4ADE80", heat: "#FCD34D", cost: "#FCD34D",
  },
  sunset: {
    label: "Sunset",
    power: "#FF6B6B", water: "#FFA94D", gas: "#FF2A7A", solar: "#FFD84A", heat: "#FF8A3A", cost: "#FFD84A",
  },
  mono: {
    label: "Mono",
    power: "#E4E4E7", water: "#A1A1AA", gas: "#F4F4F5", solar: "#D4D4D8", heat: "#E4E4E7", cost: "#E4E4E7",
  },
};

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "vivid",
  "screen": "energy",
  "showCode": false,
  "showBezel": true,
  "showEntityIds": true,
  "ringStyle": "glow",
  "navAccent": true,
  "fontScale": 1
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(DEFAULTS);
  const [screen, setScreen] = useState(t.screen || "energy");
  const [showCode, setShowCode] = useState(false);

  // Simulated state
  const [data, setData] = useState({
    power: 350,
    water: 315,
    gas: 8.4,
    gridImport: 14.5,
    gridExport: 11.8,
    solar: 18.32,
    cost: 12.67,
    dynamicPrice: 0.28,
    temp: 21.4,
    setpoint: 21.0,
    indoorTemp: 21.4,
    outdoorTemp: 14,
    hvacMode: "heat",
    fanSpeed: 35,
    rooms: [
      { id: "climate.living_room", name: "Woonkamer", temp: 21.4, humidity: 48 },
      { id: "climate.bedroom", name: "Slaapkamer", temp: 19.2, humidity: 52 },
      { id: "climate.bathroom", name: "Badkamer", temp: 22.8, humidity: 64 },
      { id: "climate.office", name: "Werkkamer", temp: 20.6, humidity: 45 },
    ],
    lights: [
      { id: "light.woonkamer_plafond", name: "Woonkamer plafond", on: true, brightness: 70, color: "#FFD84A" },
      { id: "light.eettafel", name: "Eettafel", on: true, brightness: 45, color: "#FF8A3A" },
      { id: "light.keuken_spots", name: "Keuken spots", on: false, brightness: 80, color: "#FFFFFF" },
      { id: "light.hal", name: "Hal", on: false, brightness: 60, color: "#34D0FF" },
      { id: "light.werkkamer", name: "Werkkamer", on: true, brightness: 90, color: "#2EE36A" },
      { id: "light.tuin", name: "Tuin", on: false, brightness: 50, color: "#8A4DFF" },
    ],
    scenes: [
      { id: "movie", name: "Film", emoji: "🎬", color: "#FF2A7A" },
      { id: "dinner", name: "Diner", emoji: "🍷", color: "#FF8A3A" },
      { id: "focus", name: "Focus", emoji: "💡", color: "#2EE36A" },
      { id: "sleep", name: "Slapen", emoji: "🌙", color: "#34D0FF" },
    ],
    activeScene: "dinner",
    player: {
      track: "Sunset Drive",
      artist: "Atlas & Astra",
      duration: 234,
      position: 87,
      playing: true,
      shuffle: false,
      repeat: true,
      volume: 42,
    },
    cameras: [
      { id: "cam_voordeur", entity: "camera.voordeur", name: "Voordeur", location: "Buiten · noord", online: true, resolution: "1080p", fps: 25,
        bg: "linear-gradient(180deg, #1a2840 0%, #0a1020 60%, #1a1810 100%)",
        scene: "radial-gradient(ellipse at 40% 60%, rgba(120,180,255,0.4), transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,200,100,0.3), transparent 40%)" },
      { id: "cam_achtertuin", entity: "camera.achtertuin", name: "Achtertuin", location: "Buiten · zuid", online: true, resolution: "1080p", fps: 30,
        bg: "linear-gradient(180deg, #0a3018 0%, #1a4028 50%, #0a2010 100%)",
        scene: "radial-gradient(ellipse at 30% 70%, rgba(80,200,120,0.5), transparent 60%)" },
      { id: "cam_garage", entity: "camera.garage", name: "Garage", location: "Binnen", online: true, resolution: "720p", fps: 15,
        bg: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
        scene: "radial-gradient(ellipse at 50% 50%, rgba(255,180,100,0.3), transparent 60%)" },
      { id: "cam_oprit", entity: "camera.oprit", name: "Oprit", location: "Buiten · oost", online: false, resolution: "1080p", fps: 25,
        bg: "linear-gradient(180deg, #1a1a20 0%, #0a0a10 100%)",
        scene: "" },
    ],
    selectedCamera: "cam_voordeur",
    weather: {
      location: "Amsterdam",
      now: { temp: 14, condition: "Licht bewolkt", feels: 13, precip: 10, wind: 12, humidity: 68 },
      hourly: [
        { time: "14:00", temp: 14, icon: "sun" },
        { time: "15:00", temp: 15, icon: "sun" },
        { time: "16:00", temp: 15, icon: "cloud" },
        { time: "17:00", temp: 14, icon: "cloud" },
        { time: "18:00", temp: 12, icon: "rain" },
        { time: "19:00", temp: 11, icon: "rain" },
      ],
      daily: [
        { day: "Vandaag", icon: "cloud", low: 10, high: 16 },
        { day: "Wo", icon: "rain", low: 9, high: 13 },
        { day: "Do", icon: "sun", low: 11, high: 18 },
        { day: "Vr", icon: "sun", low: 12, high: 20 },
        { day: "Za", icon: "cloud", low: 11, high: 17 },
      ],
      range: { min: 8, max: 22 },
    },
  });

  // Live "wandering" power for that authentic energy-monitor feel
  useEffect(() => {
    const id = setInterval(() => {
      setData((d) => {
        const delta = Math.round((Math.random() - 0.4) * 40);
        const next = Math.max(120, Math.min(2400, d.power + delta));
        return { ...d, power: next };
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  // Sync active screen tweak
  useEffect(() => { setTweak("screen", screen); }, [screen]);

  const palette = PALETTES[t.palette] || PALETTES.vivid;
  const accents = palette;

  const now = useClock();

  const activeScreen = SCREENS.find((s) => s.id === screen) || SCREENS[0];
  // Update CSS var for nav accent
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-power", accents.power);
    document.documentElement.style.setProperty("--accent-water", accents.water);
    document.documentElement.style.setProperty("--accent-gas", accents.gas);
    document.documentElement.style.setProperty("--accent-solar", accents.solar);
    document.documentElement.style.setProperty("--accent-heat", accents.heat);
    document.documentElement.style.setProperty("--accent-cost", accents.cost);
  }, [accents]);

  return (
    <div className="device">
      <div className="device-bezel" style={t.showBezel ? {} : { background: "transparent", boxShadow: "none", padding: 0 }}>
        <div className="screen" style={{ fontSize: `${t.fontScale * 16}px` }}>
          <div className="app">
            {/* Nav */}
            <div className="nav">
              <div className="nav-logo">H</div>
              {SCREENS.map((s) => {
                const IconCmp = Icon[s.icon];
                return (
                  <button key={s.id}
                    className={"nav-btn" + (screen === s.id ? " active" : "")}
                    onClick={() => setScreen(s.id)}
                    style={{ "--nav-accent": t.navAccent ? s.color : "var(--ink)" }}
                  >
                    <IconCmp />
                  </button>
                );
              })}
              <div className="nav-spacer" />
              <div className="nav-mini">ESP32-S3</div>
              <button className="nav-btn" onClick={() => setShowCode(true)}>
                <Icon.settings />
              </button>
            </div>

            {/* Status bar */}
            <div className="status">
              <div className="status-left">
                <div className="status-clock">{fmtTime(now)}</div>
                <div className="status-date">{fmtDateNL(now)}</div>
              </div>
              <div className="status-right">
                <div className="status-chip" style={{ color: accents.solar }}>
                  <Icon.sun style={{ width: 14, height: 14 }} />
                  <strong style={{ color: "var(--ink)" }}>{data.weather.now.temp}°</strong>
                  <span style={{ color: "var(--ink-dim)" }}>Amsterdam</span>
                </div>
                <div className="status-chip">
                  <Icon.bolt style={{ width: 14, height: 14, color: accents.power }} />
                  <strong>{data.power} W</strong>
                </div>
                <div className="status-chip">
                  <span className="status-dot" style={{ background: accents.solar, boxShadow: `0 0 6px ${accents.solar}` }} />
                  HA
                </div>
              </div>
            </div>

            {/* Main */}
            <div className="main">
              {SCREENS.map((s) => (
                <div key={s.id} className={"screen-view" + (screen === s.id ? " active" : "")}>
                  {s.id === "energy" && <EnergyScreen data={data} setData={setData} accents={accents} />}
                  {s.id === "climate" && <ClimateScreen data={data} setData={setData} accents={accents} />}
                  {s.id === "lights" && <LightsScreen data={data} setData={setData} accents={accents} />}
                  {s.id === "spotify" && <SpotifyScreen data={data} setData={setData} accents={accents} />}
                  {s.id === "camera" && <CameraScreen data={data} setData={setData} accents={accents} />}
                  {s.id === "weather" && <WeatherScreen data={data} accents={accents} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {t.showBezel && (
        <div className="device-stand">7" RGB · ESP32-S3 · 1024×600</div>
      )}

      {/* Floating code button */}
      <button className="code-btn" onClick={() => setShowCode(true)}>
        {"</>"} ESPHome YAML
      </button>

      {showCode && <CodeModal onClose={() => setShowCode(false)} />}

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Design">
          <TweakSelect
            label="Kleurpalet"
            value={t.palette}
            onChange={(v) => setTweak("palette", v)}
            options={Object.entries(PALETTES).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <TweakRadio
            label="Ring stijl"
            value={t.ringStyle}
            onChange={(v) => setTweak("ringStyle", v)}
            options={[
              { value: "glow", label: "Glow" },
              { value: "flat", label: "Flat" },
            ]}
          />
          <TweakToggle label="Toon entity IDs" value={t.showEntityIds} onChange={(v) => setTweak("showEntityIds", v)} />
          <TweakToggle label="Gekleurde nav-accent" value={t.navAccent} onChange={(v) => setTweak("navAccent", v)} />
        </TweakSection>
        <TweakSection title="Device">
          <TweakToggle label="Toon device frame" value={t.showBezel} onChange={(v) => setTweak("showBezel", v)} />
          <TweakSlider label="Font scale" min={0.9} max={1.15} step={0.05} value={t.fontScale} onChange={(v) => setTweak("fontScale", v)} />
        </TweakSection>
        <TweakSection title="Demo">
          <TweakButton label="Open ESPHome YAML" onClick={() => setShowCode(true)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
