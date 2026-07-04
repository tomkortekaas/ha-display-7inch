// Camera feeds screen — grid + selected feed
function CameraScreen({ data, setData, accents }) {
  const { cameras, selectedCamera } = data;
  const setSelected = (id) => setData((d) => ({ ...d, selectedCamera: id }));
  const cam = cameras.find((c) => c.id === selectedCamera) || cameras[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, height: "100%" }}>
      {/* Main feed */}
      <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative", background: "#0a0a0a" }}>
        <CameraFeed cam={cam} large />
        {/* HUD overlay */}
        <div style={{
          position: "absolute", top: 12, left: 12, right: 12,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div className="pill" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "white" }}>
            <span className="dot" style={{ background: cam.online ? accents.gas : accents.heat, boxShadow: `0 0 6px ${cam.online ? accents.gas : accents.heat}` }} />
            {cam.online ? "LIVE · REC" : "OFFLINE"}
          </div>
          <div className="pill" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "white", fontFamily: "JetBrains Mono, monospace" }}>
            {cam.resolution} · {cam.fps}fps
          </div>
        </div>
        <div style={{
          position: "absolute", bottom: 12, left: 12, right: 12,
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{cam.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>{cam.entity}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
              <Icon.mic />
            </button>
            <button className="icon-btn" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
              <Icon.expand />
            </button>
          </div>
        </div>
      </div>

      {/* Camera list */}
      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="card-title" style={{ margin: 0 }}>Camera's</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
          {cameras.map((c) => (
            <button key={c.id}
              onClick={() => setSelected(c.id)}
              style={{
                background: c.id === selectedCamera ? "var(--card-2)" : "transparent",
                border: "1px solid " + (c.id === selectedCamera ? "rgba(255,255,255,0.12)" : "var(--line)"),
                borderRadius: 12,
                padding: 8,
                cursor: "pointer",
                textAlign: "left",
                color: "var(--ink)",
                display: "grid",
                gridTemplateColumns: "64px 1fr auto",
                gap: 10,
                alignItems: "center",
              }}>
              <div style={{ width: 64, height: 40, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                <CameraFeed cam={c} />
                {!c.online && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "grid", placeItems: "center" }}>
                    <span style={{ fontSize: 9, color: accents.heat, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>OFFLINE</span>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--ink-low)", fontFamily: "JetBrains Mono, monospace" }}>{c.location}</div>
              </div>
              <span className="dot" style={{
                width: 6, height: 6, borderRadius: "50%",
                background: c.online ? accents.solar : accents.heat,
                boxShadow: c.online ? `0 0 6px ${accents.solar}` : "none",
              }} />
            </button>
          ))}
        </div>

        {/* Motion alert */}
        <div style={{
          background: `linear-gradient(135deg, ${accents.gas}1a 0%, transparent 100%)`,
          border: `1px solid ${accents.gas}33`,
          borderRadius: 10, padding: 10,
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accents.gas}33`, display: "grid", placeItems: "center", color: accents.gas }}>
            <Icon.bolt style={{ width: 14, height: 14 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: accents.gas }}>BEWEGING GEDETECTEERD</div>
            <div style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 2 }}>Voordeur · 14:32</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Procedural camera "feed" — animated noise / scanlines, not real footage.
// Renders a placeholder scene per camera so the design reads as real.
function CameraFeed({ cam, large }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: cam.bg,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0,
        background: "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px)",
        pointerEvents: "none",
      }} />
      {/* "Subject" placeholder */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: cam.scene,
        backgroundSize: "cover",
        backgroundPosition: "center",
        mixBlendMode: "screen",
        opacity: 0.85,
      }} />
      {/* Noise */}
      {large && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }} />
      )}
      {large && cam.online && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 8, height: 8, borderRadius: "50%",
          background: "#ff2a3a",
          boxShadow: "0 0 8px #ff2a3a",
          animation: "blink 1.2s ease-in-out infinite",
        }} />
      )}
      <style>{`@keyframes blink { 50% { opacity: 0.2; } }`}</style>
    </div>
  );
}

window.CameraScreen = CameraScreen;
