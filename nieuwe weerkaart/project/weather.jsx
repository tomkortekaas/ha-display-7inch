// weather.jsx — Drie weerscherm-varianten (480×480) in dezelfde stijl als de afzuigkap.
// Exporteert: WeatherNow, WeatherHourly, WeatherDaily naar window.
const { useState } = React;

/* ===================================================================== */
/* WEERICONEN — eenvoudige glyphs (vertaalbaar naar mdi/openweather in LVGL) */
/* ===================================================================== */
function Cloud({ x = 0, y = 0, s = 1, color = "currentColor" }) {
  // pluizige wolk uit cirkels + vlakke onderkant, één fill = geen naden
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
      <circle cx="17" cy="27" r="9" />
      <circle cx="29" cy="23" r="12" />
      <circle cx="40" cy="28" r="8" />
      <rect x="14" y="29" width="29" height="9" rx="0" />
    </g>
  );
}

function WeatherIcon({ type = "partly", size = 120, color = "currentColor" }) {
  const sun = (cx, cy, r, rays = true) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {rays && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={cx} y1={cy - r - 3} x2={cx} y2={cy - r - 9}
          stroke={color} strokeWidth="3.4" strokeLinecap="round"
          transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
    </g>
  );
  const drops = (xs, yTop) => xs.map((x, i) => (
    <line key={i} x1={x} y1={yTop} x2={x - 2.5} y2={yTop + 8}
      stroke={color} strokeWidth="3.4" strokeLinecap="round" />
  ));

  let body = null;
  if (type === "clear") {
    body = sun(28, 28, 13);
  } else if (type === "cloudy") {
    body = <Cloud x={1} y={2} color={color} />;
  } else if (type === "partly") {
    body = (<g>{sun(18, 16, 9)}<Cloud x={6} y={12} s={0.92} color={color} /></g>);
  } else if (type === "rain") {
    body = (<g><Cloud x={1} y={-2} color={color} />{drops([16, 26, 36], 40)}</g>);
  } else if (type === "drizzle") {
    body = (<g><Cloud x={1} y={-3} color={color} />{drops([20, 32], 40)}</g>);
  } else if (type === "storm") {
    body = (<g><Cloud x={1} y={-2} color={color} /><path d="M27 38 L21 50 L27 50 L23 58 L34 46 L28 46 Z" fill={color} /></g>);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" style={{ display: "block" }}>
      {body}
    </svg>
  );
}

/* kleine pictogrammen voor detail-chips */
function Glyph({ d, size = 22, color = "currentColor", stroke = 2.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>{d}</svg>
  );
}
const WindGlyph = (p) => <Glyph {...p} d={<g><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 12h15a3 3 0 1 1-3 3" /><path d="M3 16h8a2.5 2.5 0 1 1-2.5 2.5" /></g>} />;
const DropGlyph = (p) => <Glyph {...p} d={<path d="M12 3 C12 3 5 11 5 15 a7 7 0 0 0 14 0 C19 11 12 3 12 3 Z" />} />;
const RainGlyph = (p) => <Glyph {...p} d={<g><path d="M6 14a5 5 0 0 1 .6-9.9 6 6 0 0 1 11.4 1.6A4 4 0 0 1 18 14Z" /><line x1="9" y1="18" x2="8" y2="21" /><line x1="13" y1="18" x2="12" y2="21" /><line x1="17" y1="18" x2="16" y2="21" /></g>} />;
const UpGlyph = (p) => <Glyph {...p} d={<g><line x1="12" y1="20" x2="12" y2="5" /><path d="M6 11l6-6 6 6" /></g>} />;
const DownGlyph = (p) => <Glyph {...p} d={<g><line x1="12" y1="4" x2="12" y2="19" /><path d="M6 13l6 6 6-6" /></g>} />;
const UvGlyph = (p) => <Glyph {...p} stroke={2.4} d={<g><circle cx="12" cy="12" r="4" />{[0,45,90,135,180,225,270,315].map((a)=>(<line key={a} x1="12" y1="3.5" x2="12" y2="1" transform={`rotate(${a} 12 12)`} />))}</g>} />;

/* temperatuur → kleur (koud blauw → warm oranje), zoals clock-weather-card */
function tempColor(t) {
  const x = Math.max(0, Math.min(1, (t + 5) / 40));
  const hue = 250 - x * 228;
  return `oklch(0.74 0.13 ${hue})`;
}
/* UV-index → label + kleur */
function uvInfo(u) {
  if (u <= 2) return { lab: "Laag", c: "oklch(0.74 0.13 150)" };
  if (u <= 5) return { lab: "Matig", c: "oklch(0.80 0.14 95)" };
  if (u <= 7) return { lab: "Hoog", c: "oklch(0.78 0.15 60)" };
  if (u <= 10) return { lab: "Zeer hoog", c: "oklch(0.66 0.20 28)" };
  return { lab: "Extreem", c: "oklch(0.60 0.22 330)" };
}
/* UV-index → zonnebrand-advies (WHO: vanaf UV 3 bescherming aanraden) */
function uvAdvice(u) {
  if (u < 3) return { txt: "insmeren niet nodig", need: false };
  if (u <= 7) return { txt: "smeer je in", need: true };
  return { txt: "goed insmeren + schaduw", need: true };
}
/* klein zonnebrand-tube icoon */
const SunscreenGlyph = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <rect x="7" y="8" width="10" height="13" rx="2.5" />
    <path d="M9.5 8V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V8" />
    <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

/* ===================================================================== */
/* ACCENT per conditie                                                   */
/* ===================================================================== */
const ACCENT = {
  clear:   { c: "oklch(0.82 0.13 78)",  glow: "rgba(245,190,90,.55)" },   // warm amber
  partly:  { c: "oklch(0.78 0.09 235)", glow: "rgba(120,180,235,.5)" },   // koel blauw
  cloudy:  { c: "oklch(0.74 0.04 240)", glow: "rgba(150,170,195,.4)" },   // grijsblauw
  rain:    { c: "oklch(0.70 0.12 248)", glow: "rgba(90,150,235,.55)" },   // regenblauw
  drizzle: { c: "oklch(0.72 0.09 240)", glow: "rgba(110,160,225,.5)" },
  storm:   { c: "oklch(0.66 0.15 285)", glow: "rgba(150,120,235,.55)" },
};

function Topbar({ place = "AMERSFOORT" }) {
  return (
    <div className="topbar">
      <span className="brand">{place}</span>
      <span className="status"><i className="dot" /> live · 14:32</span>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT A — NU (hero)                                                  */
/* ===================================================================== */
function WeatherNow() {
  const cond = "partly";
  const a = ACCENT[cond];
  return (
    <div className="screen">
      <Topbar />
      <div className="wx-hero">
        <div className="wx-iconwrap" style={{ "--g": a.glow }}>
          <WeatherIcon type={cond} size={150} color={a.c} />
        </div>
        <div className="wx-now">
          <div className="wx-temp">14<span className="wx-deg">°</span></div>
          <div className="wx-cond">Licht bewolkt</div>
          <div className="wx-feels">Gevoel 12°</div>
        </div>
      </div>
      <div className="wx-minmax">
        <span><UpGlyph size={18} color="#fff" /> 16°</span>
        <span style={{ color: "var(--muted)" }}><DownGlyph size={18} color="var(--muted)" /> 9°</span>
      </div>
      <div className="wx-stats">
        <div className="wx-chip"><WindGlyph color={a.c} /><b>12</b><i>km/u</i></div>
        <div className="wx-chip"><DropGlyph color={a.c} /><b>78</b><i>%</i></div>
        <div className="wx-chip"><RainGlyph color={a.c} /><b>0.2</b><i>mm</i></div>
        <div className="wx-chip"><UvGlyph color={uvInfo(4).c} /><b>4</b><i>UV · {uvInfo(4).lab}</i></div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT B — UURVERWACHTING                                             */
/* ===================================================================== */
const HOURS = [
  { h: "nu", t: 14, c: "partly" },
  { h: "15", t: 15, c: "partly" },
  { h: "16", t: 15, c: "cloudy" },
  { h: "17", t: 13, c: "rain" },
  { h: "18", t: 12, c: "rain" },
  { h: "19", t: 11, c: "drizzle" },
];
function WeatherHourly() {
  const cur = ACCENT.partly;
  const temps = HOURS.map((x) => x.t);
  const min = Math.min(...temps), max = Math.max(...temps);
  const pts = HOURS.map((x, i) => {
    const px = 40 + i * ((520 - 80) / (HOURS.length - 1));
    const py = 18 + (1 - (x.t - min) / (max - min || 1)) * 30;
    return [px, py];
  });
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  return (
    <div className="screen">
      <Topbar />
      <div className="wx-cur">
        <div className="wx-iconwrap sm" style={{ "--g": cur.glow }}>
          <WeatherIcon type="partly" size={62} color={cur.c} />
        </div>
        <div className="wx-temp sm">14<span className="wx-deg">°</span></div>
        <div className="wx-curmeta">
          <div className="wx-cond sm">Licht bewolkt</div>
          <div className="wx-feels">Gevoel 12° · ↑16° ↓9° · <b style={{ color: uvInfo(4).c, fontWeight: 800 }}>UV 4</b></div>
        </div>
      </div>
      <div className="wx-sectlabel">KOMENDE UREN</div>
      <div className="wx-hourbox">
        <svg className="wx-curve" viewBox="0 0 560 56" preserveAspectRatio="none">
          <path d={path} fill="none" stroke="var(--line2)" strokeWidth="2.5" />
          {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={ACCENT[HOURS[i].c].c} />)}
        </svg>
        <div className="wx-hours">
          {HOURS.map((x, i) => {
            const aa = ACCENT[x.c];
            return (
              <div key={i} className={"wx-hour" + (i === 0 ? " on" : "")}>
                <span className="wx-h">{x.h}</span>
                <WeatherIcon type={x.c} size={34} color={aa.c} />
                <span className="wx-ht">{x.t}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT C — DAGVERWACHTING                                             */
/* ===================================================================== */
const DAYS = [
  { d: "Vandaag", c: "partly", lo: 9, hi: 16, w: { s: 12, dir: "ZW", deg: 45 } },
  { d: "Wo", c: "rain", lo: 8, hi: 13, w: { s: 18, dir: "W", deg: 90 } },
  { d: "Do", c: "drizzle", lo: 7, hi: 12, w: { s: 22, dir: "NW", deg: 135 } },
  { d: "Vr", c: "clear", lo: 6, hi: 17, w: { s: 8, dir: "O", deg: 270 } },
  { d: "Za", c: "cloudy", lo: 9, hi: 15, w: { s: 14, dir: "ZW", deg: 45 } },
];

/* windpijl — wijst in de richting waarheen de wind waait (deg, 0 = noord/omhoog) */
const WindArrow = ({ deg = 0, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", transform: `rotate(${deg}deg)` }}>
    <line x1="12" y1="21" x2="12" y2="4" /><path d="M7 9l5-5 5 5" />
  </svg>
);

/* compacte zon-boog met op-/ondergangstijden */
function SunArc({ rise = 5.53, set = 21.75, now = 14.53 }) {
  const f = Math.max(0, Math.min(1, (now - rise) / (set - rise)));
  const cx = 64, cy = 56, r = 42;
  const ang = Math.PI - f * Math.PI;
  const sx = cx + r * Math.cos(ang), sy = cy - r * Math.sin(ang);
  const fmt = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  return (
    <div className="dd-sun">
      <svg viewBox="0 0 128 64" className="dd-sunsvg">
        <path d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--line2)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
        <circle cx={cx - r} cy={cy} r="2.5" fill="var(--muted)" />
        <circle cx={cx + r} cy={cy} r="2.5" fill="var(--muted)" />
        <circle cx={sx} cy={sy} r="6" fill="oklch(0.84 0.13 80)" />
        <circle cx={sx} cy={sy} r="11" fill="oklch(0.84 0.13 80)" opacity="0.25" />
      </svg>
      <div className="dd-suntimes"><span>↑ {fmt(rise)}</span><span>↓ {fmt(set)}</span></div>
    </div>
  );
}

/* Buienradar-achtige neerslaggrafiek (komende ~2 uur) */
const RAIN = [0, 0, 0, 0, 0.05, 0.2, 0.45, 0.6, 0.5, 0.3, 0.12, 0.03];
function BuienGraph() {
  const n = RAIN.length, maxR = 0.7, H = 34;
  const xy = RAIN.map((v, i) => [(i / (n - 1)) * 100, H - (Math.min(v, maxR) / maxR) * (H - 4)]);
  const area = `M0 ${H} ` + xy.map((p) => `L${p[0]} ${p[1]}`).join(" ") + ` L100 ${H} Z`;
  const line = "M" + xy.map((p) => `${p[0]} ${p[1]}`).join(" L");
  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="dd-rainsvg">
      <defs>
        <linearGradient id="rainfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.70 0.12 248)" stopOpacity="0.55" />
          <stop offset="1" stopColor="oklch(0.70 0.12 248)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rainfill)" />
      <path d={line} fill="none" stroke="oklch(0.74 0.12 248)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ===================================================================== */
/* VARIANT E — DAG (mix van C + D): hero + buienradar + zon + forecast    */
/* ===================================================================== */
function WeatherDay() {
  const cond = "partly", a = ACCENT[cond], uv = uvInfo(4);
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo, cur = 14;
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AMERSFOORT</span>
        <span className="pager"><i /><i /><i className="on" /></span>
        <span className="status"><i className="dot" /> di 3 juni · 14:32</span>
      </div>
      <div className="dd-hero">
        <div className="wx-iconwrap sm" style={{ "--g": a.glow }}>
          <WeatherIcon type={cond} size={92} color={a.c} />
        </div>
        <div className="dd-now">
          <div className="dd-temp">14<span className="wx-deg">°</span></div>
          <div className="dd-cond">Licht bewolkt</div>
          <div className="dd-sub">
            <span className="dd-wind"><WindArrow deg={DAYS[0].w.deg} size={16} color={a.c} /> {DAYS[0].w.s} km/u {DAYS[0].w.dir}</span>
            <span className="dd-uv" style={{ color: uv.c }}><UvGlyph size={15} color={uv.c} /> UV {4}</span>
          </div>
        </div>
      </div>
      <div className="dd-cards">
        <div className="dd-card">
          <div className="dd-cardhead"><span>BUIENRADAR</span><b>lichte regen ~17u</b></div>
          <BuienGraph />
          <div className="dd-rainx"><span>nu</span><span>+1u</span><span>+2u</span></div>
        </div>
        <div className="dd-card">
          <div className="dd-cardhead"><span>ZON</span><b>15u 13m daglicht</b></div>
          <SunArc />
        </div>
      </div>
      <div className="dd-days">
        {DAYS.map((x, i) => {
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          const dot = (cur - x.lo) / (x.hi - x.lo);
          return (
            <div key={i} className="dd-day">
              <span className="dd-dname">{x.d === "Vandaag" ? "Nu" : x.d}</span>
              <WeatherIcon type={x.c} size={28} color={ACCENT[x.c].c} />
              <span className="dd-wmini"><WindArrow deg={x.w.deg} size={13} color="var(--muted)" />{x.w.s}</span>
              <span className="cw-lo">{x.lo}°</span>
              <span className="cw-track">
                <span className="cw-fill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor((x.lo + x.hi) / 2)}, ${tempColor(x.hi)})` }}>
                  {i === 0 && <span className="cw-now" style={{ left: dot * 100 + "%" }} />}
                </span>
              </span>
              <span className="cw-hi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* horizontale zon-strip (leesbaarder dan een mini-boog) */
function SunStrip({ rise = 5.53, set = 21.75, now = 14.53 }) {
  const f = Math.max(0, Math.min(1, (now - rise) / (set - rise)));
  const fmt = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  return (
    <div className="ss">
      <div className="ss-side"><span className="ss-ico">↑</span><span className="ss-t">{fmt(rise)}</span></div>
      <div className="ss-track">
        <span className="ss-fill" style={{ width: f * 100 + "%" }} />
        <span className="ss-sun" style={{ left: f * 100 + "%" }} />
      </div>
      <div className="ss-side r"><span className="ss-ico">↓</span><span className="ss-t">{fmt(set)}</span></div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT E2 — DAG met DUIDELIJKER bovenhelft                           */
/* ===================================================================== */
function WeatherDay2() {
  const cond = "partly", a = ACCENT[cond], uv = uvInfo(4);
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo, cur = 14;
  const show = DAYS.slice(0, 4);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AMERSFOORT</span>
        <span className="pager"><i /><i /><i className="on" /></span>
        <span className="status"><i className="dot" /> di 3 juni · 14:32</span>
      </div>
      <div className="dd-hero">
        <div className="wx-iconwrap sm" style={{ "--g": a.glow }}>
          <WeatherIcon type={cond} size={96} color={a.c} />
        </div>
        <div className="dd-now">
          <div className="dd-temp">14<span className="wx-deg">°</span></div>
          <div className="dd-cond">Licht bewolkt</div>
          <div className="dd-sub">
            <span className="dd-wind"><WindArrow deg={DAYS[0].w.deg} size={17} color={a.c} /> {DAYS[0].w.s} km/u {DAYS[0].w.dir}</span>
            <span className="dd-uv" style={{ color: uv.c }}><UvGlyph size={16} color={uv.c} /> UV {4}</span>
          </div>
        </div>
      </div>

      {/* volle-breedte neerslagkaart — groter & leesbaar */}
      <div className="d2-rain">
        <div className="d2-rainhead">
          <span className="d2-lab">NEERSLAG · 2 UUR</span>
          <b className="d2-cap">Lichte regen rond 17:00</b>
        </div>
        <div className="d2-graph"><BuienGraph /></div>
        <div className="d2-rainx"><span>nu</span><span>+30m</span><span>+1u</span><span>+1.5u</span><span>+2u</span></div>
      </div>

      {/* zon als brede leesbare strip */}
      <div className="d2-sun">
        <span className="d2-sunlab">ZON</span>
        <SunStrip />
        <span className="d2-sundur">15u 13m</span>
      </div>

      <div className="dd-days d2-days">
        {show.map((x, i) => {
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          const dot = (cur - x.lo) / (x.hi - x.lo);
          return (
            <div key={i} className="dd-day">
              <span className="dd-dname">{x.d === "Vandaag" ? "Nu" : x.d}</span>
              <WeatherIcon type={x.c} size={28} color={ACCENT[x.c].c} />
              <span className="dd-wmini"><WindArrow deg={x.w.deg} size={13} color="var(--muted)" />{x.w.s}</span>
              <span className="cw-lo">{x.lo}°</span>
              <span className="cw-track">
                <span className="cw-fill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor((x.lo + x.hi) / 2)}, ${tempColor(x.hi)})` }}>
                  {i === 0 && <span className="cw-now" style={{ left: dot * 100 + "%" }} />}
                </span>
              </span>
              <span className="cw-hi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* Neerslag als STAAFJES (zoals het ESP-scherm: BAR-chart) */
const RAINBARS = [0, 0, 0.02, 0.08, 0.18, 0.34, 0.52, 0.6, 0.5, 0.32, 0.14, 0.05];
const RAINBARS_WIDE = [0, 0, 0, 0.02, 0.05, 0.12, 0.22, 0.36, 0.5, 0.58, 0.6, 0.55, 0.46, 0.34, 0.24, 0.14, 0.08, 0.03];
function BuienBars({ bars = RAINBARS }) {
  const max = 0.7;
  return (
    <div className="bb" style={{ gridTemplateColumns: `repeat(${bars.length}, 1fr)` }}>
      {bars.map((v, i) => {
        const h = Math.min(v, max) / max;
        return (
          <div key={i} className="bb-col">
            <div className="bb-bar" style={{ height: Math.max(4, h * 100) + "%", opacity: v < 0.02 ? 0.22 : 1 }} />
          </div>
        );
      })}
    </div>
  );
}

/* halve-cirkel zon-boog (compact, voor het zon/UV-paneel) */
function SunDial({ rise = 5.53, set = 21.75, now = 14.53, size = 130 }) {
  const f = Math.max(0, Math.min(1, (now - rise) / (set - rise)));
  const w = size, h = size * 0.56, r = w / 2 - 8, cx = w / 2, cy = h - 4;
  const ang = Math.PI - f * Math.PI;
  const sx = cx + r * Math.cos(ang), sy = cy - r * Math.sin(ang);
  const arc = `M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fL = (Math.PI * r);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="sd">
      <defs>
        <linearGradient id="sdg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="oklch(0.70 0.10 60)" />
          <stop offset="0.5" stopColor="oklch(0.86 0.13 82)" />
          <stop offset="1" stopColor="oklch(0.70 0.10 60)" />
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke="var(--surface-2)" strokeWidth="4" strokeLinecap="round" />
      <path d={arc} fill="none" stroke="url(#sdg)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={fL} strokeDashoffset={fL * (1 - f)} />
      <circle cx={sx} cy={sy} r="11" fill="oklch(0.86 0.13 82)" opacity="0.25" />
      <circle cx={sx} cy={sy} r="6" fill="oklch(0.88 0.14 84)" />
    </svg>
  );
}

/* UV-meter als gradient-schaal met marker */
function UvMeter({ uv = 4 }) {
  const info = uvInfo(uv);
  const pct = Math.max(0, Math.min(1, uv / 11)) * 100;
  return (
    <div className="uvm">
      <div className="uvm-top">
        <span className="uvm-val" style={{ color: info.c }}>{uv}</span>
        <span className="uvm-lab">{info.lab}</span>
      </div>
      <div className="uvm-scale">
        <span className="uvm-marker" style={{ left: pct + "%" }} />
      </div>
      <div className="uvm-ends"><span>0</span><span>11</span></div>
    </div>
  );
}

/* zon + UV gecombineerd paneel (rechterkolom) */
function SunUvCard() {
  const fmt = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  return (
    <div className="suc">
      <div className="suc-sun">
        <SunDial />
        <div className="suc-times">
          <span className="suc-t"><i>↑</i>{fmt(5.53)}</span>
          <span className="suc-dur">15u 13m</span>
          <span className="suc-t r"><i>↓</i>{fmt(21.75)}</span>
        </div>
      </div>
      <div className="suc-div" />
      <div className="suc-uvlab">UV-INDEX</div>
      <UvMeter uv={4} />
    </div>
  );
}

/* ===================================================================== */
/* VARIANT E3 — staaf-neerslag + zon/UV rechts                           */
/* ===================================================================== */
function WeatherDay3() {
  const cond = "partly", a = ACCENT[cond];
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo, cur = 14;
  const show = DAYS.slice(0, 4);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AMERSFOORT</span>
        <span className="pager"><i /><i /><i className="on" /></span>
        <span className="status"><i className="dot" /> di 3 juni · 14:32</span>
      </div>

      <div className="d3-top">
        <div className="d3-left">
          <div className="d3-hero">
            <div className="wx-iconwrap sm" style={{ "--g": a.glow }}>
              <WeatherIcon type={cond} size={84} color={a.c} />
            </div>
            <div className="d3-now">
              <div className="dd-temp">14<span className="wx-deg">°</span></div>
              <div className="dd-cond">Licht bewolkt</div>
            </div>
          </div>
          <div className="d3-meta">
            <span className="dd-wind"><WindArrow deg={DAYS[0].w.deg} size={16} color={a.c} /> {DAYS[0].w.s} km/u {DAYS[0].w.dir}</span>
            <span className="d3-feels">Gevoel 12°</span>
          </div>
          <div className="d3-rain">
            <div className="d3-rainhead">
              <span className="d2-lab">NEERSLAG</span>
              <b className="d3-cap">Regen ~17:00</b>
            </div>
            <BuienBars />
            <div className="d3-rainx"><span>nu</span><span>+1u</span><span>+2u</span></div>
          </div>
        </div>
        <SunUvCard />
      </div>

      <div className="dd-days d3-days">
        {show.map((x, i) => {
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          const dot = (cur - x.lo) / (x.hi - x.lo);
          return (
            <div key={i} className="dd-day">
              <span className="dd-dname">{x.d === "Vandaag" ? "Nu" : x.d}</span>
              <WeatherIcon type={x.c} size={28} color={ACCENT[x.c].c} />
              <span className="dd-wmini"><WindArrow deg={x.w.deg} size={13} color="var(--muted)" />{x.w.s}</span>
              <span className="cw-lo">{x.lo}°</span>
              <span className="cw-track">
                <span className="cw-fill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor((x.lo + x.hi) / 2)}, ${tempColor(x.hi)})` }}>
                  {i === 0 && <span className="cw-now" style={{ left: dot * 100 + "%" }} />}
                </span>
              </span>
              <span className="cw-hi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* gecombineerde zon + UV kaart, horizontaal (boog links · UV rechts) */
function SunUvWide() {
  const fmt = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  const info = uvInfo(4);
  const pct = (4 / 11) * 100;
  return (
    <div className="suw">
      <div className="suw-sun">
        <SunDial size={86} />
        <div className="suw-times">
          <span className="suc-t"><i>↑</i>{fmt(5.53)}</span>
          <span className="suc-t r"><i>↓</i>{fmt(21.75)}</span>
        </div>
        <div className="suw-dur">15u 13m</div>
      </div>
      <div className="suw-div" />
      <div className="suw-uv">
        <div className="suc-uvlab">UV-INDEX</div>
        <div className="uvm-top"><span className="uvm-val" style={{ color: info.c }}>4</span><span className="uvm-lab">{info.lab}</span></div>
        <div className="uvm-scale"><span className="uvm-marker" style={{ left: pct + "%" }} /></div>
        <div className="uvm-ends"><span>0</span><span>11</span></div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT E4 — gecombineerde zon/UV-kaart + neerslag volle breedte      */
/* ===================================================================== */
function WeatherDay4() {
  const cond = "partly", a = ACCENT[cond];
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo, cur = 14;
  const show = DAYS.slice(0, 4);
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AMERSFOORT</span>
        <span className="pager"><i /><i /><i className="on" /></span>
        <span className="status"><i className="dot" /> di 3 juni · 14:32</span>
      </div>

      <div className="d4-top">
        <div className="d4-hero">
          <div className="wx-iconwrap sm" style={{ "--g": a.glow }}>
            <WeatherIcon type={cond} size={78} color={a.c} />
          </div>
          <div className="d3-now">
            <div className="dd-temp">14<span className="wx-deg">°</span></div>
            <div className="dd-cond">Licht bewolkt</div>
            <div className="d4-meta"><WindArrow deg={DAYS[0].w.deg} size={15} color={a.c} /> {DAYS[0].w.s} km/u {DAYS[0].w.dir}</div>
          </div>
        </div>
        <SunUvWide />
      </div>

      <div className="d4-rain">
        <div className="d3-rainhead">
          <span className="d2-lab">NEERSLAG · KOMENDE 2 UUR</span>
          <b className="d3-cap">Lichte regen rond 17:00</b>
        </div>
        <BuienBars bars={RAINBARS_WIDE} />
        <div className="d4-rainx"><span>nu</span><span>+30m</span><span>+1u</span><span>+1.5u</span><span>+2u</span></div>
      </div>

      <div className="dd-days d4-days">
        {show.map((x, i) => {
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          const dot = (cur - x.lo) / (x.hi - x.lo);
          return (
            <div key={i} className="dd-day">
              <span className="dd-dname">{x.d === "Vandaag" ? "Nu" : x.d}</span>
              <WeatherIcon type={x.c} size={28} color={ACCENT[x.c].c} />
              <span className="dd-wmini"><WindArrow deg={x.w.deg} size={13} color="var(--muted)" />{x.w.s}</span>
              <span className="cw-lo">{x.lo}°</span>
              <span className="cw-track">
                <span className="cw-fill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor((x.lo + x.hi) / 2)}, ${tempColor(x.hi)})` }}>
                  {i === 0 && <span className="cw-now" style={{ left: dot * 100 + "%" }} />}
                </span>
              </span>
              <span className="cw-hi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* zon-boog met UV-index in het hart (kleur volgt UV-niveau) */
function SunUvArc({ rise = 5.53, set = 21.75, now = 14.53, uv = 4 }) {
  const info = uvInfo(uv);
  const adv = uvAdvice(uv);
  const fmt = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0");
  return (
    <div className="sua">
      <div className="sua-arcwrap">
        <SunDial size={132} rise={rise} set={set} now={now} />
        <div className="sua-uv">
          <span className="sua-uvlab">UV-INDEX</span>
          <span className="sua-uvval" style={{ color: info.c }}>{uv}</span>
          <span className="sua-uvcat" style={{ color: info.c }}>{info.lab}</span>
        </div>
      </div>
      <div className="sua-adv" style={{ color: adv.need ? info.c : "var(--muted)" }}>
        {adv.txt}
      </div>
      <div className="sua-times">
        <span className="suc-t"><i>↑</i>{fmt(rise)}</span>
        <span className="sua-dur">15u 13m</span>
        <span className="suc-t r"><i>↓</i>{fmt(set)}</span>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT E5 — UV in de zonneboog + 5-daagse forecast                   */
/* ===================================================================== */
function WeatherDay5() {
  const cond = "partly", a = ACCENT[cond];
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo, cur = 14;
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AMERSFOORT</span>
        <span className="pager"><i /><i /><i className="on" /></span>
        <span className="status"><i className="dot" /> di 3 juni · 14:32</span>
      </div>

      <div className="d5-top">
        <div className="d4-hero">
          <div className="wx-iconwrap sm" style={{ "--g": a.glow }}>
            <WeatherIcon type={cond} size={76} color={a.c} />
          </div>
          <div className="d3-now">
            <div className="dd-temp">14<span className="wx-deg">°</span></div>
            <div className="dd-cond">Licht bewolkt</div>
            <div className="d4-meta"><WindArrow deg={DAYS[0].w.deg} size={15} color={a.c} /> {DAYS[0].w.s} km/u {DAYS[0].w.dir}</div>
          </div>
        </div>
        <SunUvArc uv={4} />
      </div>

      <div className="d5-rain">
        <div className="d3-rainhead">
          <span className="d2-lab">NEERSLAG · KOMENDE 2 UUR</span>
          <b className="d3-cap">Lichte regen rond 17:00</b>
        </div>
        <BuienBars bars={RAINBARS_WIDE} />
        <div className="d4-rainx"><span>nu</span><span>+30m</span><span>+1u</span><span>+1.5u</span><span>+2u</span></div>
      </div>

      <div className="dd-days d5-days">
        {DAYS.map((x, i) => {
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          const dot = (cur - x.lo) / (x.hi - x.lo);
          return (
            <div key={i} className="dd-day">
              <span className="dd-dname">{x.d === "Vandaag" ? "Nu" : x.d}</span>
              <WeatherIcon type={x.c} size={26} color={ACCENT[x.c].c} />
              <span className="dd-wmini"><WindArrow deg={x.w.deg} size={12} color="var(--muted)" />{x.w.s}</span>
              <span className="cw-lo">{x.lo}°</span>
              <span className="cw-track">
                <span className="cw-fill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor((x.lo + x.hi) / 2)}, ${tempColor(x.hi)})` }}>
                  {i === 0 && <span className="cw-now" style={{ left: dot * 100 + "%" }} />}
                </span>
              </span>
              <span className="cw-hi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function WeatherDaily() {
  const cur = ACCENT.partly;
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo;
  return (
    <div className="screen">
      <Topbar />
      <div className="wx-cur compact">
        <div className="wx-iconwrap sm" style={{ "--g": cur.glow }}>
          <WeatherIcon type="partly" size={54} color={cur.c} />
        </div>
        <div className="wx-temp sm">14<span className="wx-deg">°</span></div>
        <div className="wx-curmeta">
          <div className="wx-cond sm">Licht bewolkt</div>
          <div className="wx-feels">Amersfoort · gevoel 12° · <b style={{ color: uvInfo(4).c, fontWeight: 800 }}>UV 4</b></div>
        </div>
      </div>
      <div className="wx-sectlabel">5-DAAGS</div>
      <div className="wx-days">
        {DAYS.map((x, i) => {
          const aa = ACCENT[x.c];
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          return (
            <div key={i} className={"wx-day" + (i === 0 ? " on" : "")}>
              <span className="wx-dname">{x.d}</span>
              <WeatherIcon type={x.c} size={30} color={aa.c} />
              <span className="wx-dlo">{x.lo}°</span>
              <span className="wx-bar">
                <span className="wx-barfill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor(x.hi)})` }} />
              </span>
              <span className="wx-dhi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================================================================== */
/* VARIANT D — VOORUITBLIK (verlopende balken + zon/maan)  [referentie]   */
/* ===================================================================== */
const MoonGlyph = (p) => <Glyph {...p} stroke={0} d={<path d="M20 14.5 A8 8 0 1 1 11 5 A6.4 6.4 0 0 0 20 14.5 Z" fill="currentColor" />} />;
const SunSmall = (p) => <Glyph {...p} d={<g><circle cx="12" cy="12" r="4" />{[0,45,90,135,180,225,270,315].map((a)=>(<line key={a} x1="12" y1="4" x2="12" y2="2" transform={`rotate(${a} 12 12)`} />))}</g>} />;

function WeatherForecast() {
  const lo = Math.min(...DAYS.map((x) => x.lo));
  const hi = Math.max(...DAYS.map((x) => x.hi));
  const span = hi - lo;
  const cur = 14; // huidige temperatuur, marker op vandaag
  const sunrise = 5.5, sunset = 21.75, now = 14.53;
  const pos = (h) => (h / 24) * 100;
  return (
    <div className="screen">
      <div className="topbar">
        <span className="brand">AMERSFOORT</span>
        <span className="status"><i className="dot" /> di 3 juni · 14:32 · UV 4</span>
      </div>
      <div className="cw-days">
        {DAYS.map((x, i) => {
          const left = ((x.lo - lo) / span) * 100;
          const width = ((x.hi - x.lo) / span) * 100;
          const dot = (cur - x.lo) / (x.hi - x.lo);
          return (
            <div key={i} className="cw-day">
              <span className="cw-dname">{x.d === "Vandaag" ? "Nu" : x.d}</span>
              <WeatherIcon type={x.c} size={26} color={ACCENT[x.c].c} />
              <span className="cw-lo">{x.lo}°</span>
              <span className="cw-track">
                <span className="cw-fill" style={{ left: left + "%", width: width + "%", background: `linear-gradient(90deg, ${tempColor(x.lo)}, ${tempColor((x.lo+x.hi)/2)}, ${tempColor(x.hi)})` }}>
                  {i === 0 && <span className="cw-now" style={{ left: dot * 100 + "%" }} />}
                </span>
              </span>
              <span className="cw-hi">{x.hi}°</span>
            </div>
          );
        })}
      </div>
      <div className="cw-sun">
        <span className="cw-sun-day" style={{ left: pos(sunrise) + "%", width: pos(sunset - sunrise) + "%" }} />
        <span className="cw-moon"><MoonGlyph size={20} color="var(--muted)" /></span>
        <span className="cw-suni" style={{ left: pos((sunrise + sunset) / 2) + "%" }}><SunSmall size={20} color="#15140e" /></span>
        <span className="cw-nowline" style={{ left: pos(now) + "%" }} />
      </div>
      <div className="cw-hours">
        {HOURS.map((x, i) => (
          <div key={i} className="cw-hr">
            <span className="cw-hrt">{x.h === "nu" ? "nu" : x.h + "u"}</span>
            <span className="cw-hrv">{x.t}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { WeatherNow, WeatherHourly, WeatherDaily, WeatherForecast, WeatherDay, WeatherDay2, WeatherDay3, WeatherDay4, WeatherDay5 });
