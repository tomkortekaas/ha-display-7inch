// screens.jsx — Drie ontwerpvarianten voor het afzuigkap-bedienscherm (480×480)
// Exporteert: ScreenArcs, ScreenColumns, ScreenTiles naar window.
const { useState } = React;

/* ---------- Iconen (eenvoudige line-glyphs, vertaalbaar naar mdi in LVGL) ---------- */
function FanIcon({ size = 34, color = "currentColor", spin = false }) {
  // 4-blads pinwheel
  const blades = [0, 90, 180, 270];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      style={{ display: "block", transition: "transform .6s ease" }}
      className={spin ? "fan-spin" : ""}>
      <g fill={color}>
        {blades.map((a) => (
          <path key={a}
            d="M24 24 C24 14, 30 9, 38 11 C36 19, 31 24, 24 24 Z"
            transform={`rotate(${a} 24 24)`} opacity="0.92" />
        ))}
        <circle cx="24" cy="24" r="4.2" fill="#0a0a0c" stroke={color} strokeWidth="2.4" />
      </g>
    </svg>
  );
}

function BulbIcon({ size = 34, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>
      <path d="M24 7 C15 7 9 13 9 21 C9 27 13 30 16 33 L16 37 L32 37 L32 33 C35 30 39 27 39 21 C39 13 33 7 24 7 Z" />
      <line x1="18" y1="41" x2="30" y2="41" />
      <line x1="20" y1="45" x2="28" y2="45" />
    </svg>
  );
}

const VENT = "var(--vent)";
const LIGHT = "var(--light)";
const LEVELS = [0, 1, 2, 3];

/* ===================================================================== */
/* VARIANT A — ARC DIALS                                                 */
/* ===================================================================== */
function ArcDial({ level, accent, glow, size = 190 }) {
  const c = size / 2, r = size * 0.41, sw = size * 0.063, pct = 75; // 270° boog
  const fill = (pct * level) / 3;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <g transform={`rotate(135 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} pathLength="100" fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${pct} 100`} />
        <circle cx={c} cy={c} r={r} pathLength="100" fill="none"
          stroke={accent} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${fill} 100`}
          style={{ transition: "stroke-dasharray .35s cubic-bezier(.4,0,.2,1)",
                   filter: level ? `drop-shadow(0 0 6px ${glow})` : "none" }} />
      </g>
    </svg>
  );
}

function DialColumn({ icon, label, level, setLevel, accent, glow }) {
  return (
    <div className="dial-col" onClick={() => setLevel((level + 1) % 4)}>
      <div className="dial-wrap">
        <ArcDial level={level} accent={accent} glow={glow} />
        <div className="dial-center">
          <div className="dial-icon" style={{ color: level ? accent : "var(--muted)" }}>{icon}</div>
          <div className="dial-num" style={{ color: level ? "#fff" : "var(--muted)" }}>{level}</div>
        </div>
      </div>
      <div className="dial-label">{label}</div>
      <div className="dial-ticks">
        {LEVELS.map((l) => (
          <span key={l} style={{ background: l !== 0 && l <= level ? accent : "rgba(255,255,255,0.12)" }} />
        ))}
      </div>
    </div>
  );
}

function ScreenArcs() {
  const [vent, setVent] = useState(2);
  const [light, setLight] = useState(1);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AFZUIGKAP</span>
        <span className="status"><i className="dot" /> verbonden</span>
      </div>
      <div className="dials">
        <DialColumn icon={<FanIcon spin={vent > 0} />} label="VENTILATIE" level={vent} setLevel={setVent} accent="var(--vent)" glow="rgba(56,189,248,.55)" />
        <div className="divider" />
        <DialColumn icon={<BulbIcon />} label="VERLICHTING" level={light} setLevel={setLight} accent="var(--light)" glow="rgba(245,180,90,.55)" />
      </div>
      <div className="hint">tik om te schakelen</div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT B — SEGMENT-KOLOMMEN                                          */
/* ===================================================================== */
function SegColumn({ icon, label, level, setLevel, accent, glow }) {
  // segmenten 3 (boven) .. 1 (onder); 0 = leeg
  const segs = [3, 2, 1];
  return (
    <div className="seg-col">
      <div className="seg-head" style={{ color: level ? accent : "var(--muted)" }}>{icon}</div>
      <div className="seg-tube">
        {segs.map((s) => (
          <button key={s} className="seg" onClick={() => setLevel(level === s ? s - 1 : s)}>
            <span className="seg-fill" style={{
              opacity: s <= level ? 1 : 0,
              background: accent,
              boxShadow: s <= level ? `0 0 18px ${glow}` : "none",
            }} />
          </button>
        ))}
      </div>
      <div className="seg-num" style={{ color: level ? "#fff" : "var(--muted)" }}>{level}</div>
      <div className="seg-label">{label}</div>
    </div>
  );
}

function ScreenColumns() {
  const [vent, setVent] = useState(2);
  const [light, setLight] = useState(3);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AFZUIGKAP</span>
        <span className="status"><i className="dot" /> verbonden</span>
      </div>
      <div className="cols">
        <SegColumn icon={<FanIcon size={38} spin={vent > 0} />} label="VENTILATIE" level={vent} setLevel={setVent} accent="var(--vent)" glow="rgba(56,189,248,.5)" />
        <SegColumn icon={<BulbIcon size={38} />} label="VERLICHTING" level={light} setLevel={setLight} accent="var(--light)" glow="rgba(245,180,90,.5)" />
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT C — DISCRETE TEGELS                                           */
/* ===================================================================== */
function TileRow({ icon, label, level, setLevel, accent, glow, offGlyph }) {
  return (
    <div className="tile-row">
      <div className="tile-info">
        <div className="tile-icon" style={{ color: level ? accent : "var(--muted)" }}>{icon}</div>
        <div className="tile-meta">
          <div className="tile-label">{label}</div>
          <div className="tile-val" style={{ color: level ? accent : "var(--muted)" }}>
            {level === 0 ? "UIT" : "STAND " + level}
          </div>
        </div>
      </div>
      <div className="tile-btns">
        {LEVELS.map((l) => {
          const on = l === level;
          return (
            <button key={l} className={"tile-btn" + (on ? " on" : "")}
              onClick={() => setLevel(l)}
              style={on ? { background: accent, boxShadow: `0 0 22px ${glow}`, color: "#0a0a0c", borderColor: accent } : {}}>
              {l === 0 ? offGlyph : l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScreenTiles() {
  const [vent, setVent] = useState(1);
  const [light, setLight] = useState(2);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AFZUIGKAP</span>
        <span className="status"><i className="dot" /> verbonden</span>
      </div>
      <div className="tiles">
        <TileRow icon={<FanIcon size={40} spin={vent > 0} />} label="VENTILATIE" level={vent} setLevel={setVent} accent="var(--vent)" glow="rgba(56,189,248,.45)" offGlyph="0" />
        <TileRow icon={<BulbIcon size={40} />} label="VERLICHTING" level={light} setLevel={setLight} accent="var(--light)" glow="rgba(245,180,90,.45)" offGlyph="⏻" />
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT D — HYBRIDE: BOOG-DIAL + DIRECTE KNOPPEN                       */
/* ===================================================================== */
function HybridColumn({ icon, label, level, setLevel, accent, glow, offGlyph }) {
  return (
    <div className="hyb-col">
      <div className="hyb-dial">
        <ArcDial level={level} accent={accent} glow={glow} size={158} />
        <div className="hyb-center">
          <div className="hyb-icon" style={{ color: level ? accent : "var(--muted)" }}>{icon}</div>
          <div className="hyb-num" style={{ color: level ? "#fff" : "var(--muted)" }}>{level}</div>
        </div>
      </div>
      <div className="hyb-label">{label}</div>
      <div className="hyb-btns">
        {LEVELS.map((l) => {
          const on = l === level;
          return (
            <button key={l} className={"hyb-btn" + (on ? " on" : "")}
              onClick={() => setLevel(l)}
              style={on ? { background: accent, color: "#0a0a0c", borderColor: accent, boxShadow: `0 0 18px ${glow}` } : {}}>
              {l === 0 ? offGlyph : l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScreenHybrid() {
  const [vent, setVent] = useState(2);
  const [light, setLight] = useState(1);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AFZUIGKAP</span>
        <span className="status"><i className="dot" /> verbonden</span>
      </div>
      <div className="hyb">
        <HybridColumn icon={<FanIcon size={30} spin={vent > 0} />} label="VENTILATIE" level={vent} setLevel={setVent} accent="var(--vent)" glow="rgba(56,189,248,.5)" offGlyph="0" />
        <div className="divider" />
        <HybridColumn icon={<BulbIcon size={30} />} label="VERLICHTING" level={light} setLevel={setLight} accent="var(--light)" glow="rgba(245,180,90,.5)" offGlyph="⏻" />
      </div>
    </div>
  );
}

Object.assign(window, { ScreenArcs, ScreenColumns, ScreenTiles, ScreenHybrid });
