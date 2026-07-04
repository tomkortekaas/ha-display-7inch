// spotify-4inch.jsx — Spotify "nu afgespeeld" voor 4" 480×480 (ESP32-S3 + LVGL)
// Drie varianten in dezelfde huisdisplay-stijl als de afzuigkap / het weerscherm.
// Exporteert: SpotCover, SpotCompact, SpotAmbient naar window.
const { useState, useEffect, useRef } = React;

/* ---------- media-glyphs (simpele line-icons, 1-op-1 naar MDI) ---------- */
const ic = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function PlayIcon({ s = 28 }) { return (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 4.5 L19 12 L7 19.5 Z" fill="currentColor" /></svg>); }
function PauseIcon({ s = 28 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.3" /><rect x="14" y="5" width="4" height="14" rx="1.3" /></svg>); }
function NextIcon({ s = 24 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5 5 L15 12 L5 19 Z" /><rect x="16" y="5" width="3" height="14" rx="1.2" /></svg>); }
function PrevIcon({ s = 24 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 5 L9 12 L19 19 Z" /><rect x="5" y="5" width="3" height="14" rx="1.2" /></svg>); }
function ShuffleIcon({ s = 20 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M3 6 h4 l10 12 h4" /><path d="M3 18 h4 l3.5 -4.2" /><path d="M14.5 8.2 L17 6 h4" /><path d="M18.5 3.5 L21 6 L18.5 8.5" /><path d="M18.5 15.5 L21 18 L18.5 20.5" /></svg>); }
function RepeatIcon({ s = 20 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M6 7 h10 a3 3 0 0 1 3 3 v1" /><path d="M18 4.5 L20.5 7 L18 9.5" /><path d="M18 17 H8 a3 3 0 0 1 -3 -3 v-1" /><path d="M6 19.5 L3.5 17 L6 14.5" /></svg>); }
function VolIcon({ s = 22 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M4 9 h3 l4 -3.5 v13 l-4 -3.5 H4 Z" fill="currentColor" stroke="none" /><path d="M15.5 9 a4 4 0 0 1 0 6" /><path d="M18 6.5 a7.5 7.5 0 0 1 0 11" /></svg>); }
function DeviceIcon({ s = 16 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><rect x="4" y="3" width="16" height="18" rx="3" /><circle cx="12" cy="15" r="3.2" /><circle cx="12" cy="7" r="1" fill="currentColor" /></svg>); }
function HeartIcon({ s = 20, fill = false }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic} fill={fill ? "currentColor" : "none"}><path d="M12 20 C12 20 4 14.5 4 8.8 A4.2 4.2 0 0 1 12 6.4 A4.2 4.2 0 0 1 20 8.8 C20 14.5 12 20 12 20 Z" /></svg>); }

const fmt = (sec) => { const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return m + ":" + String(s).padStart(2, "0"); };

/* gedeelde afspeel-state + tikbare seek/volume */
function usePlayer({ start = 74, total = 218, vol0 = 0.62 } = {}) {
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(start);
  const [vol, setVol] = useState(vol0);
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [liked, setLiked] = useState(true);
  const barRef = useRef(null);
  const volRef = useRef(null);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos((p) => (p >= total ? 0 : p + 1)), 1000);
    return () => clearInterval(t);
  }, [playing]);
  const seek = (e) => { const r = barRef.current.getBoundingClientRect(); setPos(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total); };
  const setVolume = (e) => { const r = volRef.current.getBoundingClientRect(); setVol(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
  return { playing, setPlaying, pos, total, vol, shuffle, setShuffle, repeat, setRepeat, liked, setLiked, barRef, volRef, seek, setVolume };
}

/* album-art placeholder (gestreepte gradient + mono-tag, conform stijlgids) */
function Cover({ className, g, tag = "album art" }) {
  return (
    <div className={"cover " + className} style={{ "--g": g }}>
      <span className="ph-tag">{tag}</span>
    </div>
  );
}

const Eq = ({ on }) => (
  <span className="eq" data-on={on}><i /><i /><i /><i /></span>
);

function Topbar({ playing, place = "KEUKEN", time = "14:32" }) {
  return (
    <div className="topbar">
      <span className="brand"><Eq on={playing} /> {place}</span>
      <span className="status"><i className="dot" /> {time}</span>
    </div>
  );
}

/* gedeeld voortgangsbalkje */
function Progress({ p }) {
  const pct = (p.pos / p.total) * 100;
  return (
    <div className="prog">
      <div className="prog-track" ref={p.barRef} onClick={p.seek}>
        <span className="prog-fill" style={{ width: pct + "%" }} />
        <span className="prog-knob" style={{ left: pct + "%" }} />
      </div>
      <div className="prog-times"><span>{fmt(p.pos)}</span><span>-{fmt(p.total - p.pos)}</span></div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT A — COVER (album-forward, gecentreerd)                        */
/* ===================================================================== */
function SpotCover() {
  const p = usePlayer();
  return (
    <div className="scr va">
      <Topbar playing={p.playing} />
      <Cover className="va-cover" g="linear-gradient(145deg,#2a8f5a,#11633a 52%,#0c2b1e)" />
      <div className="va-meta">
        <div className="va-title">Midnight City</div>
        <div className="va-artist">M83</div>
      </div>
      <Progress p={p} />
      <div className="transport va-transport">
        <button className={"tbtn" + (p.shuffle ? " act" : "")} onClick={() => p.setShuffle(!p.shuffle)}><ShuffleIcon /></button>
        <button className="tbtn big"><PrevIcon /></button>
        <button className="tplay" onClick={() => p.setPlaying(!p.playing)}>{p.playing ? <PauseIcon /> : <PlayIcon />}</button>
        <button className="tbtn big"><NextIcon /></button>
        <button className={"tbtn" + (p.repeat ? " act" : "")} onClick={() => p.setRepeat(!p.repeat)}><RepeatIcon /></button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT B — COMPACT (alles bedienbaar: hero-rij + volume)             */
/* ===================================================================== */
function SpotCompact() {
  const p = usePlayer();
  return (
    <div className="scr vb">
      <Topbar playing={p.playing} />
      <div className="vb-hero">
        <Cover className="vb-cover" g="linear-gradient(150deg,oklch(0.62 0.15 30),oklch(0.42 0.13 18) 55%,#2a1013)" />
        <div className="vb-info">
          <div className="vb-title">Midnight City</div>
          <div className="vb-artist">M83</div>
          <div className="vb-album">Hurry Up, We're Dreaming</div>
        </div>
        <button className="vb-like" onClick={() => p.setLiked(!p.liked)} style={{ color: p.liked ? "var(--green)" : "var(--muted)" }}>
          <HeartIcon fill={p.liked} />
        </button>
      </div>
      <Progress p={p} />
      <div className="transport vb-transport">
        <button className={"tbtn" + (p.shuffle ? " act" : "")} onClick={() => p.setShuffle(!p.shuffle)}><ShuffleIcon /></button>
        <button className="tbtn big"><PrevIcon /></button>
        <button className="tplay" onClick={() => p.setPlaying(!p.playing)}>{p.playing ? <PauseIcon /> : <PlayIcon />}</button>
        <button className="tbtn big"><NextIcon /></button>
        <button className={"tbtn" + (p.repeat ? " act" : "")} onClick={() => p.setRepeat(!p.repeat)}><RepeatIcon /></button>
      </div>
      <div className="vol">
        <span className="vol-ic"><VolIcon /></span>
        <div className="vol-track" ref={p.volRef} onClick={p.setVolume}>
          <span className="vol-fill" style={{ width: p.vol * 100 + "%" }} />
          <span className="vol-knob" style={{ left: p.vol * 100 + "%" }} />
        </div>
        <span className="vol-pct">{Math.round(p.vol * 100)}</span>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT C — AMBIENT (full-bleed cover + frosted bediening)            */
/* ===================================================================== */
function SpotAmbient() {
  const p = usePlayer();
  const pct = (p.pos / p.total) * 100;
  return (
    <div className="scr vc">
      <div className="vc-bg" style={{ "--g": "linear-gradient(160deg,oklch(0.58 0.15 285),oklch(0.42 0.13 255) 46%,#0a0b1a 92%)" }}>
        <span className="ph-tag">album art</span>
      </div>
      <div className="vc-scrim" />
      <div className="vc-top">
        <span className="vc-pill"><DeviceIcon /> Woonkamer</span>
        <span className="vc-pill ghost"><Eq on={p.playing} /> nu afgespeeld</span>
      </div>
      <div className="vc-bottom">
        <div className="vc-head">
          <div className="vc-meta">
            <div className="vc-title">Midnight City</div>
            <div className="vc-artist">M83 · Hurry Up, We're Dreaming</div>
          </div>
          <button className="vc-like" onClick={() => p.setLiked(!p.liked)} style={{ color: p.liked ? "var(--green)" : "#fff" }}>
            <HeartIcon fill={p.liked} s={22} />
          </button>
        </div>
        <div className="prog vc-prog">
          <div className="prog-track" ref={p.barRef} onClick={p.seek}>
            <span className="prog-fill" style={{ width: pct + "%" }} />
            <span className="prog-knob" style={{ left: pct + "%" }} />
          </div>
          <div className="prog-times"><span>{fmt(p.pos)}</span><span>{fmt(p.total)}</span></div>
        </div>
        <div className="transport vc-transport">
          <button className={"tbtn" + (p.shuffle ? " act" : "")} onClick={() => p.setShuffle(!p.shuffle)}><ShuffleIcon /></button>
          <button className="tbtn"><PrevIcon /></button>
          <button className="tplay" onClick={() => p.setPlaying(!p.playing)}>{p.playing ? <PauseIcon /> : <PlayIcon />}</button>
          <button className="tbtn"><NextIcon /></button>
          <button className={"tbtn" + (p.repeat ? " act" : "")} onClick={() => p.setRepeat(!p.repeat)}><RepeatIcon /></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SpotCover, SpotCompact, SpotAmbient });
