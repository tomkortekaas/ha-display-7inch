// spotify.jsx — Nu-afgespeeld bedienkaart, 1024×600 (JC1060P470C, 7")
// Exporteert: SpotifyCard naar window.
const { useState, useEffect, useRef } = React;

/* ---------- media-glyphs (simpele line-icons) ---------- */
const ic = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function PlayIcon({ s = 30 }) { return (<svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 4.5 L19 12 L7 19.5 Z" fill="currentColor" /></svg>); }
function PauseIcon({ s = 30 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.3" /><rect x="14" y="5" width="4" height="14" rx="1.3" /></svg>); }
function NextIcon({ s = 26 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5 5 L15 12 L5 19 Z" /><rect x="16" y="5" width="3" height="14" rx="1.2" /></svg>); }
function PrevIcon({ s = 26 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 5 L9 12 L19 19 Z" /><rect x="5" y="5" width="3" height="14" rx="1.2" /></svg>); }
function ShuffleIcon({ s = 22 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M3 6 h4 l10 12 h4" /><path d="M3 18 h4 l3.5 -4.2" /><path d="M14.5 8.2 L17 6 h4" /><path d="M18.5 3.5 L21 6 L18.5 8.5" /><path d="M18.5 15.5 L21 18 L18.5 20.5" /></svg>); }
function RepeatIcon({ s = 22 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M6 7 h10 a3 3 0 0 1 3 3 v1" /><path d="M18 4.5 L20.5 7 L18 9.5" /><path d="M18 17 H8 a3 3 0 0 1 -3 -3 v-1" /><path d="M6 19.5 L3.5 17 L6 14.5" /></svg>); }
function VolIcon({ s = 24 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M4 9 h3 l4 -3.5 v13 l-4 -3.5 H4 Z" fill="currentColor" stroke="none" /><path d="M15.5 9 a4 4 0 0 1 0 6" /><path d="M18 6.5 a7.5 7.5 0 0 1 0 11" /></svg>); }
function DeviceIcon({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" {...ic}><rect x="4" y="3" width="16" height="18" rx="3" /><circle cx="12" cy="15" r="3.2" /><circle cx="12" cy="7" r="1" fill="currentColor" /></svg>); }

const fmt = (sec) => { const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return m + ":" + String(s).padStart(2, "0"); };

function SpotifyCard() {
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(74);          // seconden
  const [vol, setVol] = useState(0.62);
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const total = 218;                            // 3:38
  const barRef = useRef(null);
  const volRef = useRef(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos((p) => (p >= total ? 0 : p + 1)), 1000);
    return () => clearInterval(t);
  }, [playing]);

  const seek = (e) => { const r = barRef.current.getBoundingClientRect(); setPos(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total); };
  const setVolume = (e) => { const r = volRef.current.getBoundingClientRect(); setVol(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };

  return (
    <div className="sp">
      {/* sfeer-gloed achter album */}
      <div className="sp-glow" />

      {/* album-art */}
      <div className="sp-art">
        <div className="sp-cover"><span className="ph-tag">album art</span></div>
        <div className="sp-device"><DeviceIcon /> <span>Keuken · luidspreker</span></div>
      </div>

      {/* rechter paneel */}
      <div className="sp-main">
        <div className="sp-eyebrow">
          <span className="eq" data-on={playing}><i /><i /><i /><i /></span>
          NU AFGESPEELD
        </div>

        <div className="sp-title">Midnight City</div>
        <div className="sp-artist">M83</div>
        <div className="sp-album">Hurry Up, We're Dreaming · 2011</div>

        {/* voortgang */}
        <div className="sp-prog">
          <div className="sp-track" ref={barRef} onClick={seek}>
            <span className="sp-fill" style={{ width: (pos / total) * 100 + "%" }} />
            <span className="sp-knob" style={{ left: (pos / total) * 100 + "%" }} />
          </div>
          <div className="sp-times"><span>{fmt(pos)}</span><span>{fmt(total)}</span></div>
        </div>

        {/* transport */}
        <div className="sp-transport">
          <button className={"sp-sec" + (shuffle ? " act" : "")} onClick={() => setShuffle(!shuffle)}><ShuffleIcon /></button>
          <button className="sp-sec big" onClick={() => setPos(0)}><PrevIcon /></button>
          <button className="sp-play" onClick={() => setPlaying(!playing)}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
          <button className="sp-sec big" onClick={() => setPos(total)}><NextIcon /></button>
          <button className={"sp-sec" + (repeat ? " act" : "")} onClick={() => setRepeat(!repeat)}><RepeatIcon /></button>
        </div>

        {/* volume */}
        <div className="sp-vol">
          <span className="sp-vol-ic"><VolIcon /></span>
          <div className="sp-voltrack" ref={volRef} onClick={setVolume}>
            <span className="sp-volfill" style={{ width: vol * 100 + "%" }} />
            <span className="sp-volknob" style={{ left: vol * 100 + "%" }} />
          </div>
          <span className="sp-vol-pct">{Math.round(vol * 100)}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SpotifyCard });
