// photos.jsx — Immich fotoroulatie, drie varianten (480×480)
// Exporteert: ImmichFullbleed, ImmichGallery, ImmichEditorial naar window.
const { useState, useEffect, useRef } = React;

/* ---------- Placeholder-"foto's" (jouw Immich-foto's komen hier) ---------- */
const PHOTOS = [
  { grad: "linear-gradient(145deg,#c8794a,#5a3320 55%,#241410)", place: "Toscane, Italië",     date: "12 juli 2024",  album: "Zomer 2024" },
  { grad: "linear-gradient(145deg,#4a86c8,#23456e 55%,#101d2e)", place: "Lofoten, Noorwegen",   date: "3 maart 2023",  album: "Roadtrip" },
  { grad: "linear-gradient(145deg,#4fa06e,#27583c 55%,#10241a)", place: "Kyoto, Japan",         date: "8 april 2024",  album: "Japan" },
  { grad: "linear-gradient(145deg,#8a64c8,#4a3274 55%,#1d1430)", place: "Lissabon, Portugal",   date: "27 sep 2023",   album: "Stedentrip" },
];
const ROT = 4200; // ms per foto

function usePhotoRotation(interval = ROT) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % PHOTOS.length), interval);
    return () => clearInterval(t);
  }, [interval]);
  return i;
}

// gestapelde crossfade-laag; kenBurns = langzame zoom op actieve foto
function PhotoStack({ i, radius = 0, kenBurns = false }) {
  return (
    <div className="ph-stack" style={{ borderRadius: radius }}>
      {PHOTOS.map((p, idx) => (
        <div key={idx} className={"ph-layer" + (idx === i ? " on" : "") + (kenBurns ? " kb" : "")}
          style={{ backgroundImage: p.grad }}>
          <div className="ph-grain" />
        </div>
      ))}
      <span className="ph-tag">immich · foto {String(i + 1).padStart(2, "0")}</span>
    </div>
  );
}

// segmentbalk-voortgang (resets per foto via key)
function Segments({ i, accent }) {
  return (
    <div className="seg-prog">
      {PHOTOS.map((_, idx) => (
        <span key={idx} className="seg-track">
          <span className="seg-bar"
            style={{
              background: accent,
              width: idx < i ? "100%" : idx === i ? undefined : "0%",
              animation: idx === i ? `fillbar ${ROT}ms linear forwards` : "none",
            }} />
        </span>
      ))}
    </div>
  );
}

function Dots({ i, accent }) {
  return (
    <div className="dots">
      {PHOTOS.map((_, idx) => (
        <span key={idx} style={{
          background: idx === i ? accent : "rgba(255,255,255,0.22)",
          width: idx === i ? 22 : 7,
        }} />
      ))}
    </div>
  );
}

/* ===================================================================== */
/* A — FULL-BLEED AMBIENT                                                */
/* ===================================================================== */
function ImmichFullbleed() {
  const i = usePhotoRotation();
  const p = PHOTOS[i];
  return (
    <div className="imm fb">
      <PhotoStack i={i} kenBurns />
      <div className="fb-scrim-top" />
      <div className="fb-scrim-bot" />
      <div className="fb-top">
        <span className="imm-brand">IMMICH</span>
        <span className="imm-clock">20:47</span>
      </div>
      <div className="fb-bot">
        <div className="fb-place">{p.place}</div>
        <div className="fb-date">{p.date}</div>
        <Segments i={i} accent="var(--immich)" />
      </div>
    </div>
  );
}

/* ===================================================================== */
/* B — GALERIJ-KAART                                                     */
/* ===================================================================== */
function ImmichGallery() {
  const i = usePhotoRotation();
  const p = PHOTOS[i];
  return (
    <div className="imm gal">
      <div className="gal-top">
        <span className="imm-brand">IMMICH</span>
        <span className="gal-status"><i className="dot" /> synchroon</span>
      </div>
      <div className="gal-card">
        <PhotoStack i={i} radius={22} kenBurns />
      </div>
      <div className="gal-meta">
        <div className="gal-place">{p.place}</div>
        <div className="gal-sub">
          <span className="gal-date">{p.date}</span>
          <span className="gal-chip">{p.album}</span>
        </div>
      </div>
      <Dots i={i} accent="var(--immich)" />
    </div>
  );
}

/* ===================================================================== */
/* C — EDITORIAL INFOPANEEL                                              */
/* ===================================================================== */
function ImmichEditorial() {
  const i = usePhotoRotation();
  const p = PHOTOS[i];
  const next = PHOTOS[(i + 1) % PHOTOS.length];
  const dateParts = p.date.split(" ");
  return (
    <div className="imm ed">
      <div className="ed-photo">
        <PhotoStack i={i} kenBurns />
        <div className="ed-photo-line"><span style={{ animation: `fillbar ${ROT}ms linear infinite` }} /></div>
      </div>
      <div className="ed-panel">
        <div className="ed-left">
          <div className="ed-day">{dateParts[0]}</div>
          <div className="ed-monthyear">{dateParts.slice(1).join(" ")}</div>
          <div className="ed-place">{p.place}</div>
          <div className="ed-album">{p.album}</div>
        </div>
        <div className="ed-right">
          <div className="ed-next-label">VOLGENDE</div>
          <div className="ed-next-thumb" style={{ backgroundImage: next.grad }} />
          <div className="ed-count">{String(i + 1).padStart(2, "0")}<span> / {PHOTOS.length * 60}</span></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ImmichFullbleed, ImmichGallery, ImmichEditorial });
