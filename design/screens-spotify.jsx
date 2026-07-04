// Spotify "Now Playing" screen
// Note: original design — uses generic media-player styling, not the Spotify brand.

function SpotifyScreen({ data, setData, accents }) {
  const { player } = data;
  const setPlayer = (patch) => setData((d) => ({ ...d, player: { ...d.player, ...patch } }));

  // Simulate playhead
  useEffect(() => {
    if (!player.playing) return;
    const id = setInterval(() => {
      setData((d) => {
        if (!d.player.playing) return d;
        const next = d.player.position + 1;
        if (next >= d.player.duration) {
          return { ...d, player: { ...d.player, position: 0 } };
        }
        return { ...d, player: { ...d.player, position: next } };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [player.playing]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Generate gradient bars for the album-art placeholder (procedural, not copyrighted art)
  const artHue = 280;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, height: "100%" }}>
      {/* Album art placeholder */}
      <div className="card" style={{ width: 320, height: "100%", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{
          width: "100%",
          aspectRatio: "1/1",
          borderRadius: 12,
          background: `
            radial-gradient(circle at 30% 20%, ${accents.power}cc, transparent 50%),
            radial-gradient(circle at 70% 60%, ${accents.gas}aa, transparent 55%),
            radial-gradient(circle at 50% 90%, ${accents.water}aa, transparent 60%),
            #1a0d2e
          `,
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 12px 32px ${accents.power}55, 0 0 0 1px rgba(255,255,255,0.04) inset`,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "repeating-linear-gradient(45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 15px)",
          }} />
          <div style={{
            position: "absolute", bottom: 12, left: 14, right: 14,
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
              ALBUM ART
            </div>
            {/* Equalizer bars */}
            {player.playing && (
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 20 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{
                    width: 3,
                    background: "white",
                    borderRadius: 1,
                    animation: `eq${i} ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                  }} />
                ))}
                <style>{`
                  @keyframes eq0 { from { height: 6px; } to { height: 18px; } }
                  @keyframes eq1 { from { height: 14px; } to { height: 4px; } }
                  @keyframes eq2 { from { height: 8px; } to { height: 16px; } }
                  @keyframes eq3 { from { height: 16px; } to { height: 6px; } }
                `}</style>
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-low)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Speelt af op</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>Woonkamer · Sonos</div>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div className="pill" style={{ color: accents.solar, background: `${accents.solar}1a` }}>
            <span className="dot" />SPOTIFY · NU AAN HET LUISTEREN
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: 16 }}>
            {player.track}
          </div>
          <div style={{ fontSize: 18, color: "var(--ink-dim)", fontWeight: 500, marginTop: 4 }}>
            {player.artist}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-low)", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
            media_player.spotify_woonkamer
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${(player.position / player.duration) * 100}%`,
              background: "white",
              borderRadius: 2,
              transition: "width 0.4s linear",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--ink-dim)" }}>
            <span>{fmt(player.position)}</span>
            <span>-{fmt(player.duration - player.position)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <button className={"icon-btn" + (player.shuffle ? " active" : "")} onClick={() => setPlayer({ shuffle: !player.shuffle })} style={{ color: player.shuffle ? accents.solar : "var(--ink-dim)" }}>
            <Icon.shuffle />
          </button>
          <button className="icon-btn" style={{ width: 56, height: 56 }}><Icon.skipBack /></button>
          <button
            onClick={() => setPlayer({ playing: !player.playing })}
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "white", color: "black",
              border: "none", display: "grid", placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 0 24px rgba(255,255,255,0.2)",
            }}>
            {player.playing ? <Icon.pause style={{ width: 28, height: 28 }} /> : <Icon.play style={{ width: 28, height: 28 }} />}
          </button>
          <button className="icon-btn" style={{ width: 56, height: 56 }}><Icon.skipFwd /></button>
          <button className={"icon-btn" + (player.repeat ? " active" : "")} onClick={() => setPlayer({ repeat: !player.repeat })} style={{ color: player.repeat ? accents.solar : "var(--ink-dim)" }}>
            <Icon.repeat />
          </button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon.volume style={{ width: 18, height: 18, color: "var(--ink-dim)" }} />
          <div style={{ flex: 1 }}>
            <Slider value={player.volume} onChange={(v) => setPlayer({ volume: v })} color={accents.solar} suffix="%" height={26} />
          </div>
        </div>
      </div>
    </div>
  );
}

window.SpotifyScreen = SpotifyScreen;
