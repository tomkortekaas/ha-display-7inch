// Guition 7" — Immich Fotoroulatie · 800×480 · drie varianten
const { useState: useStateIM, useEffect: useEffectIM } = React;

/* ── Design tokens (project-breed) ──────────────────────── */
const IMC = {
  bg:    "#08080a",  sf:  "#131418",  sf2: "#1b1c21",
  ln:    "rgba(255,255,255,0.07)",
  cyan:  "oklch(0.74 0.13 222)",
  amber: "oklch(0.80 0.13 75)",
  muted: "oklch(0.58 0.012 250)",
  green: "oklch(0.74 0.13 150)",
};

/* ── Foto placeholders ───────────────────────────────────── */
const IM_PHOTOS = [
  { grad:"linear-gradient(135deg,#c8794a 0%,#5a3320 55%,#241410 100%)",  place:"Toscane, Italië",     date:"12 juli 2024",   album:"Zomer 2024",  year:"2024" },
  { grad:"linear-gradient(135deg,#4a86c8 0%,#23456e 55%,#101d2e 100%)",  place:"Lofoten, Noorwegen",  date:"3 maart 2023",   album:"Roadtrip",    year:"2023" },
  { grad:"linear-gradient(135deg,#4fa06e 0%,#27583c 55%,#10241a 100%)",  place:"Kyoto, Japan",        date:"8 april 2024",   album:"Japan",       year:"2024" },
  { grad:"linear-gradient(135deg,#8a64c8 0%,#4a3274 55%,#1d1430 100%)",  place:"Lissabon, Portugal",  date:"27 sep 2023",    album:"Stedentrip",  year:"2023" },
  { grad:"linear-gradient(135deg,#c84a6e 0%,#742340 55%,#30101b 100%)",  place:"Marokko, Marrakech",  date:"15 feb 2024",    album:"Winter 2024", year:"2024" },
];
const IM_ROT = 4500; // ms

function useIMRotation() {
  const [i, setI] = useStateIM(0);
  useEffectIM(() => {
    const t = setInterval(() => setI(p => (p+1) % IM_PHOTOS.length), IM_ROT);
    return () => clearInterval(t);
  }, []);
  return i;
}

/* ── Ken Burns photo layer ───────────────────────────────── */
function IMPhotoLayer({ idx, active, radius=0 }) {
  const p = IM_PHOTOS[idx];
  return (
    <div style={{
      position:"absolute", inset:0, borderRadius:radius,
      backgroundImage:p.grad, backgroundSize:"cover", backgroundPosition:"center",
      opacity: active ? 1 : 0,
      transform: active ? undefined : "scale(1.02)",
      transition: "opacity 1s ease",
      animation: active ? `imKB ${IM_ROT}ms ease-out forwards` : undefined,
    }}>
      {/* grain overlay */}
      <div style={{position:"absolute",inset:0,borderRadius:radius,
        backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 2px,transparent 2px 8px)",
        opacity:.8}}/>
    </div>
  );
}

function IMPhotoStack({ cur, radius=0 }) {
  return (
    <div style={{position:"absolute",inset:0,borderRadius:radius,overflow:"hidden"}}>
      <style>{`@keyframes imKB{from{transform:scale(1.00)}to{transform:scale(1.10)}}`}</style>
      {IM_PHOTOS.map((_,idx) => <IMPhotoLayer key={idx} idx={idx} active={idx===cur} radius={radius}/>)}
      <div style={{position:"absolute",bottom:8,left:10,
        fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:.5,
        color:"rgba(255,255,255,.45)",background:"rgba(0,0,0,.28)",
        padding:"2px 7px",borderRadius:5,backdropFilter:"blur(2px)"}}>
        immich · {String(cur+1).padStart(2,"0")}
      </div>
    </div>
  );
}

/* ── Voortgangssegmenten ─────────────────────────────────── */
function IMSegments({ cur, accent=IMC.cyan, width="100%" }) {
  return (
    <div style={{display:"flex",gap:5,width}}>
      <style>{`@keyframes imFill{from{width:0%}to{width:100%}}`}</style>
      {IM_PHOTOS.map((_,idx) => (
        <div key={idx} style={{flex:1,height:3,borderRadius:2,
          background:"rgba(255,255,255,.18)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2,background:accent,
            width: idx<cur?"100%":idx===cur?undefined:"0%",
            animation: idx===cur?`imFill ${IM_ROT}ms linear forwards`:"none"}}/>
        </div>
      ))}
    </div>
  );
}

/* ── Sync-dot ────────────────────────────────────────────── */
function IMSyncDot() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:IMC.green,
        boxShadow:`0 0 8px ${IMC.green}`}}/>
      <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,
        color:"rgba(255,255,255,.45)"}}>SYNCHROON</span>
    </div>
  );
}

/* ── Clock ───────────────────────────────────────────────── */
function IMClock() {
  const [t,setT] = useStateIM(()=>new Date());
  useEffectIM(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  return t.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});
}

/* ════════════════════════════════════════════════════════════
   VARIANT A — FULL-BLEED LANDSCHAP
   Foto vult volledig 800×480 · scrim boven + onder · groot
════════════════════════════════════════════════════════════ */
function ImmichFullbleedWide() {
  const cur = useIMRotation();
  const p   = IM_PHOTOS[cur];
  return (
    <div className="scr" style={{position:"relative",overflow:"hidden",background:"#000"}}>
      <IMPhotoStack cur={cur}/>

      {/* scrim boven */}
      <div style={{position:"absolute",inset:"0 0 auto",height:120,
        background:"linear-gradient(rgba(0,0,0,.62),transparent)",pointerEvents:"none"}}/>
      {/* scrim onder */}
      <div style={{position:"absolute",inset:"auto 0 0",height:200,
        background:"linear-gradient(transparent,rgba(0,0,0,.82))",pointerEvents:"none"}}/>

      {/* topbar */}
      <div style={{position:"absolute",top:0,left:0,right:0,
        display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"22px 30px 0"}}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:4,
          color:"rgba(255,255,255,.9)"}}>IMMICH</span>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <IMSyncDot/>
          <span style={{fontSize:14,fontWeight:600,letterSpacing:1,
            color:"rgba(255,255,255,.7)",fontVariantNumeric:"tabular-nums"}}><IMClock/></span>
        </div>
      </div>

      {/* bottombar */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 30px 26px"}}>
        <div style={{fontSize:42,fontWeight:800,letterSpacing:-1.5,lineHeight:.9,
          textShadow:"0 3px 24px rgba(0,0,0,.5)",marginBottom:6}}>{p.place}</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.75)",letterSpacing:.3}}>{p.date}</span>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,
            color:IMC.cyan,background:`color-mix(in oklch,${IMC.cyan} 16%,transparent)`,
            border:`1px solid color-mix(in oklch,${IMC.cyan} 35%,transparent)`,
            padding:"3px 10px",borderRadius:999}}>{p.album}</span>
        </div>
        <IMSegments cur={cur} accent={IMC.cyan}/>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VARIANT B — SPLIT: FOTO LINKS · INFO RECHTS
   Links 540px foto · rechts 260px donker infopaneel
════════════════════════════════════════════════════════════ */
function ImmichSplitWide() {
  const cur  = useIMRotation();
  const p    = IM_PHOTOS[cur];
  const next = IM_PHOTOS[(cur+1) % IM_PHOTOS.length];

  return (
    <div className="scr" style={{display:"flex",overflow:"hidden"}}>

      {/* ── LINKS: foto ── */}
      <div style={{width:536,flexShrink:0,position:"relative"}}>
        <IMPhotoStack cur={cur}/>
        {/* gradient naar rechts */}
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(90deg,transparent 65%,#08080a 100%)",pointerEvents:"none"}}/>
        {/* gradient naar onder */}
        <div style={{position:"absolute",inset:"auto 0 0",height:100,
          background:"linear-gradient(transparent,rgba(0,0,0,.55))",pointerEvents:"none"}}/>

        {/* jaar-badge */}
        <div style={{position:"absolute",top:20,left:22,
          fontSize:11,fontWeight:800,letterSpacing:3,
          color:"rgba(255,255,255,.7)",background:"rgba(0,0,0,.35)",
          backdropFilter:"blur(8px)",padding:"5px 12px",borderRadius:10,
          border:`1px solid rgba(255,255,255,.12)`}}>{p.year}</div>
      </div>

      {/* ── RECHTS: infopaneel ── */}
      <div style={{flex:1,background:IMC.bg,display:"flex",flexDirection:"column",
        padding:"22px 24px 22px 20px",gap:0}}>

        {/* brand + sync */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:20,flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:4,
            color:"rgba(255,255,255,.85)"}}>IMMICH</span>
          <IMSyncDot/>
        </div>

        {/* locatie */}
        <div style={{flexShrink:0}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:3,
            color:"rgba(255,255,255,.28)",marginBottom:6}}>LOCATIE</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:-.8,lineHeight:1.05}}>{p.place}</div>
        </div>

        {/* datum + album */}
        <div style={{marginTop:12,flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,.55)",letterSpacing:.3,marginBottom:8}}>{p.date}</div>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,
            color:IMC.cyan,background:`color-mix(in oklch,${IMC.cyan} 16%,transparent)`,
            border:`1px solid color-mix(in oklch,${IMC.cyan} 35%,transparent)`,
            padding:"4px 12px",borderRadius:999,display:"inline-block"}}>{p.album}</span>
        </div>

        {/* divider */}
        <div style={{height:1,background:IMC.ln,margin:"16px 0",flexShrink:0}}/>

        {/* volgende foto */}
        <div style={{flexShrink:0}}>
          <div style={{fontSize:8,fontWeight:700,letterSpacing:2.5,
            color:"rgba(255,255,255,.25)",marginBottom:10}}>VOLGENDE</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:72,height:52,borderRadius:10,flexShrink:0,
              backgroundImage:next.grad,backgroundSize:"cover",
              border:`1px solid ${IMC.ln}`,overflow:"hidden",position:"relative"}}>
              <div style={{position:"absolute",inset:0,
                backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 2px,transparent 2px 8px)"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.7)",lineHeight:1.2}}>{next.place}</div>
              <div style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.35)",marginTop:3}}>{next.date}</div>
            </div>
          </div>
        </div>

        {/* voortgang + teller */}
        <div style={{marginTop:"auto",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
            <div style={{fontSize:8,fontWeight:700,letterSpacing:2.5,color:"rgba(255,255,255,.25)"}}>VOORTGANG</div>
            <div style={{fontVariantNumeric:"tabular-nums"}}>
              <span style={{fontSize:22,fontWeight:800,letterSpacing:-1,color:"rgba(255,255,255,.85)"}}>{String(cur+1).padStart(2,"0")}</span>
              <span style={{fontSize:12,fontWeight:600,color:IMC.muted}}> / {IM_PHOTOS.length}</span>
            </div>
          </div>
          <IMSegments cur={cur} accent={IMC.cyan}/>
        </div>

        {/* klok */}
        <div style={{marginTop:14,flexShrink:0,textAlign:"right",
          fontSize:11,fontWeight:600,color:"rgba(255,255,255,.3)",
          fontVariantNumeric:"tabular-nums",letterSpacing:.5}}><IMClock/></div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VARIANT C — EDITORIAL PANORAMA
   Foto boven (800×298) · infopaneel onder (800×182)
   Thumbnails van alle albums als paginering
════════════════════════════════════════════════════════════ */
function ImmichEditorialWide() {
  const cur  = useIMRotation();
  const p    = IM_PHOTOS[cur];

  return (
    <div className="scr" style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── FOTO boven ── */}
      <div style={{height:296,position:"relative",flexShrink:0}}>
        <IMPhotoStack cur={cur}/>

        {/* topbar */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:80,
          background:"linear-gradient(rgba(0,0,0,.55),transparent)",
          display:"flex",alignItems:"flex-start",justifyContent:"space-between",
          padding:"20px 28px 0"}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:4,
            color:"rgba(255,255,255,.88)"}}>IMMICH</span>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <IMSyncDot/>
            <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.6)",
              fontVariantNumeric:"tabular-nums"}}><IMClock/></span>
          </div>
        </div>

        {/* foto-label rechtsonder */}
        <div style={{position:"absolute",bottom:14,right:18,
          fontSize:11,fontWeight:700,letterSpacing:2,
          color:"rgba(255,255,255,.65)",background:"rgba(0,0,0,.35)",
          backdropFilter:"blur(8px)",padding:"4px 12px",borderRadius:8,
          border:`1px solid rgba(255,255,255,.1)`}}>{p.album}</div>

        {/* progress line */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,
          background:"rgba(255,255,255,.1)"}}>
          <style>{`@keyframes imLine{from{width:0}to{width:100%}}`}</style>
          <div key={cur} style={{height:"100%",background:IMC.cyan,
            animation:`imLine ${IM_ROT}ms linear forwards`}}/>
        </div>
      </div>

      {/* ── INFOPANEEL onder ── */}
      <div style={{flex:1,background:IMC.bg,display:"flex",
        alignItems:"center",padding:"0 28px",gap:0}}>

        {/* locatie + datum */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:3,
            color:"rgba(255,255,255,.28)",marginBottom:6}}>HUIDIGE FOTO</div>
          <div style={{fontSize:30,fontWeight:800,letterSpacing:-1.2,
            lineHeight:.95,whiteSpace:"nowrap",overflow:"hidden",
            textOverflow:"ellipsis"}}>{p.place}</div>
          <div style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,.5)",
            marginTop:6,letterSpacing:.3}}>{p.date}</div>
        </div>

        {/* vertical divider */}
        <div style={{width:1,height:72,background:IMC.ln,flexShrink:0,margin:"0 26px"}}/>

        {/* thumbnail paginering */}
        <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
          <div style={{fontSize:8,fontWeight:700,letterSpacing:2.5,
            color:"rgba(255,255,255,.25)"}}>ALBUM NAVIGATIE</div>
          <div style={{display:"flex",gap:7}}>
            {IM_PHOTOS.map((ph,idx) => (
              <div key={idx} style={{
                width: idx===cur ? 68 : 48,
                height: 44,
                borderRadius: 10,
                backgroundImage: ph.grad,
                backgroundSize:"cover",
                flexShrink:0,
                border: idx===cur
                  ? `2px solid ${IMC.cyan}`
                  : `1px solid ${IMC.ln}`,
                boxShadow: idx===cur ? `0 0 10px color-mix(in oklch,${IMC.cyan} 40%,transparent)` : undefined,
                transition:"all .4s ease",
                overflow:"hidden",
                position:"relative",
              }}>
                <div style={{position:"absolute",inset:0,
                  backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 2px,transparent 2px 8px)"}}/>
                {idx===cur && (
                  <div style={{position:"absolute",inset:0,
                    background:`color-mix(in oklch,${IMC.cyan} 12%,transparent)`}}/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* vertical divider */}
        <div style={{width:1,height:72,background:IMC.ln,flexShrink:0,margin:"0 26px"}}/>

        {/* groot teller */}
        <div style={{flexShrink:0,textAlign:"right"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2.5,
            color:"rgba(255,255,255,.25)",marginBottom:4}}>BIBLIOTHEEK</div>
          <div style={{fontVariantNumeric:"tabular-nums"}}>
            <span style={{fontSize:40,fontWeight:800,letterSpacing:-2,
              color:IMC.cyan,lineHeight:.9}}>{String(cur+1).padStart(2,"0")}</span>
            <span style={{fontSize:16,fontWeight:600,color:IMC.muted}}> / {IM_PHOTOS.length * 60}</span>
          </div>
          <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,.3)",
            marginTop:5,letterSpacing:.5}}>FOTO'S</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ImmichFullbleedWide, ImmichSplitWide, ImmichEditorialWide });
