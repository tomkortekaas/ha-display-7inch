// Lights screen — rooms with dimmers + scene buttons

function LightsScreen({ data, setData, accents, spotifyDrawerOpen = false }) {
  const { lights, scenes } = data;
  const setLight = (idx, patch) => {
    setData((d) => ({
      ...d,
      lights: d.lights.map((l, i) => i === idx ? { ...l, ...patch } : l),
    }));
  };
  const activateScene = (id) => {
    setData((d) => ({ ...d, activeScene: id }));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: spotifyDrawerOpen ? "1.55fr 0.85fr" : "1.8fr 1fr", gap: 14, height: "100%" }}>
      <div className="card" style={{ padding: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Verlichting</div>
            <div style={{ fontSize: 11, color: "var(--ink-low)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
              {lights.filter((l) => l.on).length} aan · {lights.length - lights.filter((l) => l.on).length} uit
            </div>
          </div>
          <button
            className="icon-btn"
            style={{ width: "auto", height: 32, padding: "0 12px", fontSize: 12, fontWeight: 600, gap: 6 }}
            onClick={() => setData((d) => ({ ...d, lights: d.lights.map((l) => ({ ...l, on: false })) }))}
          >
            Alles uit
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: spotifyDrawerOpen ? "1fr" : "1fr 1fr", gap: 10, overflowY: "auto", paddingRight: 4 }}>
          {lights.map((l, i) => (
            <div key={l.id}
              style={{
                background: l.on ? `linear-gradient(135deg, ${l.color}22 0%, var(--card-2) 60%)` : "var(--card-2)",
                border: "1px solid " + (l.on ? `${l.color}55` : "var(--line)"),
                borderRadius: 14,
                padding: spotifyDrawerOpen ? 10 : 12,
                display: "flex",
                flexDirection: spotifyDrawerOpen ? "row" : "column",
                alignItems: spotifyDrawerOpen ? "center" : "stretch",
                gap: spotifyDrawerOpen ? 12 : 10,
                transition: "all 0.25s ease",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: spotifyDrawerOpen ? "1 1 auto" : "initial" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: l.on ? l.color : "var(--card)",
                    color: l.on ? "#000" : "var(--ink-dim)",
                    display: "grid", placeItems: "center",
                    transition: "all 0.25s ease",
                    boxShadow: l.on ? `0 0 16px ${l.color}66` : "none",
                  }}>
                    <Icon.light style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-low)", fontFamily: "JetBrains Mono, monospace" }}>{l.id}</div>
                  </div>
                </div>
                <Toggle on={l.on} onClick={() => setLight(i, { on: !l.on })} color={l.color} />
              </div>
              <Slider
                value={l.brightness}
                onChange={(v) => setLight(i, { brightness: v, on: v > 0 })}
                color={l.color}
                suffix="%"
                height={spotifyDrawerOpen ? 24 : 28}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scenes */}
      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column" }}>
        <div className="card-title">Scènes</div>
        <div style={{ display: "grid", gridTemplateColumns: spotifyDrawerOpen ? "1fr" : "1fr 1fr", gap: 10, flex: 1, gridAutoRows: "1fr" }}>
          {scenes.map((s) => {
            const active = data.activeScene === s.id;
            return (
              <button key={s.id}
                onClick={() => activateScene(s.id)}
                style={{
                  border: "1px solid " + (active ? s.color : "var(--line)"),
                  background: active ? `${s.color}22` : "var(--card-2)",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  alignItems: "flex-start",
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s ease",
                  color: "var(--ink)",
                  minHeight: 0,
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: s.color,
                  display: "grid", placeItems: "center",
                  boxShadow: active ? `0 0 16px ${s.color}66` : "none",
                }}>
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>scene.{s.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.LightsScreen = LightsScreen;
