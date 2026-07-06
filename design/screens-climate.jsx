// Climate screen — thermostat dial + room temperatures + HVAC modes

function ClimateScreen({ data, setData, accents, spotifyDrawerOpen = false }) {
  const { setpoint, indoorTemp, outdoorTemp, hvacMode, rooms, fanSpeed } = data;

  const setSetpoint = (v) => setData((d) => ({ ...d, setpoint: Math.max(10, Math.min(28, v)) }));
  const setMode = (m) => setData((d) => ({ ...d, hvacMode: m }));
  const setFan = (v) => setData((d) => ({ ...d, fanSpeed: v }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: spotifyDrawerOpen ? "1fr 0.9fr" : "1.2fr 1fr", gap: 14, height: "100%" }}>
      {/* Main thermostat */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Woonkamer thermostaat</div>
            <div style={{ fontSize: 11, color: "var(--ink-low)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>climate.living_room</div>
          </div>
          <div className="pill" style={{ color: accents.heat, background: `${accents.heat}1a` }}>
            <Icon.flame style={{ width: 12, height: 12 }} /> VERWARMEN
          </div>
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center", position: "relative" }}>
          <Ring size={spotifyDrawerOpen ? 214 : 260} stroke={spotifyDrawerOpen ? 16 : 20} value={setpoint - 10} max={18} color={accents.heat} dim={`${accents.heat}22`}>
            <div style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>ingesteld</div>
            <div className="ring-value" style={{ fontSize: spotifyDrawerOpen ? 68 : 86, marginTop: 4 }}>{setpoint.toFixed(1)}<span style={{ fontSize: spotifyDrawerOpen ? 26 : 32, color: "var(--ink-dim)" }}>°</span></div>
            <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 8, fontWeight: 500 }}>
              binnen <strong style={{ color: "var(--ink)" }}>{indoorTemp.toFixed(1)}°</strong> · buiten <strong style={{ color: "var(--ink)" }}>{outdoorTemp}°</strong>
            </div>
          </Ring>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 4 }}>
          <button className="icon-btn" onClick={() => setSetpoint(setpoint - 0.5)} style={{ width: 56, height: 56 }}>
            <Icon.arrowDown />
          </button>
          <button className="icon-btn" onClick={() => setSetpoint(setpoint + 0.5)} style={{ width: 56, height: 56 }}>
            <Icon.arrowUp />
          </button>
        </div>
      </div>

      {/* Right: HVAC mode + rooms */}
      <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Modus</div>
          <div style={{ display: "grid", gridTemplateColumns: spotifyDrawerOpen ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
            {[
              { id: "heat", label: "Verwarm", icon: <Icon.flame />, color: accents.heat },
              { id: "cool", label: "Koel", icon: <Icon.drop />, color: accents.water },
              { id: "auto", label: "Auto", icon: <Icon.sun />, color: accents.solar },
              { id: "off", label: "Uit", icon: <Icon.moon />, color: "#6a6a72" },
            ].map((m) => (
              <button key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  border: "1px solid " + (hvacMode === m.id ? m.color : "var(--line)"),
                  background: hvacMode === m.id ? `${m.color}1a` : "var(--card-2)",
                  borderRadius: 12,
                  padding: "10px 6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  cursor: "pointer",
                  color: hvacMode === m.id ? m.color : "var(--ink-dim)",
                  transition: "all 0.2s ease",
                }}>
                {React.cloneElement(m.icon, { style: { width: 22, height: 22 } })}
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="card-title" style={{ margin: 0 }}>Ventilatie</div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--ink-dim)" }}>{fanSpeed}%</span>
          </div>
          <Slider value={fanSpeed} onChange={setFan} color={accents.water} colorTo={accents.solar} />
        </div>

        <div className="card" style={{ padding: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="card-title">Kamers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
            {rooms.map((r, i) => (
              <div key={r.name} style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 10,
                alignItems: "center",
                padding: "8px 10px",
                background: "var(--card-2)",
                borderRadius: 10,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-low)", fontFamily: "JetBrains Mono, monospace" }}>{r.id}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: r.temp > setpoint ? accents.heat : accents.water, fontVariantNumeric: "tabular-nums" }}>
                  {r.temp.toFixed(1)}°
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-dim)", fontSize: 11 }}>
                  <Icon.drop style={{ width: 12, height: 12 }} />
                  {r.humidity}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ClimateScreen = ClimateScreen;
