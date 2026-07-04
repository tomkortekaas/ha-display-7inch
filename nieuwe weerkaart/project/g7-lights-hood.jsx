// Guition 7" — Lampenschermen · 3 afzuigkap-stijl varianten
const { useState: useStateLH, useEffect: useEffectLH, useRef: useRefLH } = React;

/* ─── Design tokens (afzuigkap-stijl) ─────────────────────── */
const LHC = {
  bg:    "#08080a",  sf:  "#131418",  sf2: "#1b1c21",
  ln:    "rgba(255,255,255,0.07)",
  amber: "oklch(0.80 0.13 75)",  cyan:  "oklch(0.74 0.13 222)",
  muted: "oklch(0.58 0.012 250)", green: "oklch(0.74 0.13 150)",
};

/* ─── Lamp & scène data ────────────────────────────────────── */
const LH_LAMPS = [
  {id:"wk",  name:"Woonkamer",  on:true,  bri:0.78},
  {id:"sl",  name:"Slaapkamer", on:false, bri:0.00},
  {id:"keu", name:"Keuken",     on:true,  bri:0.22},
  {id:"hal", name:"Hal",        on:true,  bri:0.55},
  {id:"bad", name:"Badkamer",   on:false, bri:0.00},
];
const LH_SCNS = [
  {id:"avond",label:"Avond", ct:0.85, color:"#F5B45A"},
  {id:"werk", label:"Werk",  ct:0.10, color:"#78B4EB"},
  {id:"film", label:"Film",  ct:0.90, color:"#9678EB"},
  {id:"nacht",label:"Nacht", ct:1.00, color:"#5A6EB4"},
  {id:"lees", label:"Lees",  ct:0.30, color:"#AAEABB"},
  {id:"feest",label:"Feest", ct:0.50, color:"#EB5A96"},
];

/* ─── Helpers ──────────────────────────────────────────────── */
const lhCtRgb = ct => {
  const c=[120,180,235], w=[245,180,90];
  return `rgb(${c.map((v,i)=>Math.round(v+ct*(w[i]-v))).join(",")})`;
};
const lhCtK   = ct => Math.round(6500 - ct*4000);
const lhCtLbl = ct => ct<.25?"Koel wit":ct<.55?"Neutraal":ct<.8?"Warm wit":"Extra warm";

/* ─── Arc SVG ──────────────────────────────────────────────── */
function LHArc({ size=170, r=70, sw=10, pct=0, color="#F5B45A" }) {
  const cx=size/2, cy=size/2;
  const START=225, SWEEP=270;
  const pt = a => {
    const rad=(a-90)*Math.PI/180;
    return [cx+r*Math.cos(rad), cy+r*Math.sin(rad)];
  };
  const [sx,sy]=pt(START), [ex,ey]=pt(START+SWEEP), [vx,vy]=pt(START+pct*SWEEP);
  const trackD = `M${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  const valD   = pct>.01 ? `M${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 ${pct*SWEEP>180?1:0} 1 ${vx.toFixed(2)} ${vy.toFixed(2)}` : null;
  return (
    <svg width={size} height={size} style={{display:"block",overflow:"visible"}}>
      <path d={trackD} fill="none" stroke={LHC.sf2} strokeWidth={sw} strokeLinecap="round"/>
      {valD && <path d={valD} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        style={{filter:`drop-shadow(0 0 7px ${color})`}}/>}
    </svg>
  );
}

/* ─── Tick strip ───────────────────────────────────────────── */
function LHTicks({ pct=0, color=LHC.amber, n=5 }) {
  return (
    <div style={{display:"flex",gap:5,marginTop:8}}>
      {[...Array(n)].map((_,i) => (
        <div key={i} style={{width:22,height:4,borderRadius:2,
          background:pct>=(i/(n-1))-.02?color:LHC.sf2,transition:"background .3s"}}/>
      ))}
    </div>
  );
}

/* ─── Topbar ───────────────────────────────────────────────── */
function LHTop({ title, sub }) {
  const [t,setT] = useStateLH(()=>new Date());
  useEffectLH(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  const clock = t.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});
  return (
    <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 24px",borderBottom:`1px solid ${LHC.ln}`,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,.85)"}}>{title}</span>
        {sub&&<span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.3)",letterSpacing:.5}}>{sub}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.55)",fontVariantNumeric:"tabular-nums"}}>{clock}</span>
        <span style={{width:7,height:7,borderRadius:"50%",background:LHC.green,
          boxShadow:`0 0 7px ${LHC.green}`,display:"inline-block"}}/>
      </div>
    </div>
  );
}

/* ─── CT slider bar (gedeeld) ──────────────────────────────── */
function LHCtBar({ ct, onChange, width=170 }) {
  const ref = useRefLH(null);
  const handle = e => {
    const r = ref.current.getBoundingClientRect();
    onChange(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));
  };
  return (
    <div ref={ref} onClick={handle} style={{
      width,height:8,borderRadius:4,cursor:"pointer",flexShrink:0,
      background:"linear-gradient(90deg,#78B4EB 0%,#fff 35%,#FFF4E0 60%,#F5B45A 80%,#E8821A 100%)",
      position:"relative",boxShadow:"0 2px 10px rgba(0,0,0,.5)",
    }}>
      <div style={{position:"absolute",top:"50%",left:`${ct*100}%`,
        width:16,height:16,borderRadius:"50%",background:"#fff",
        transform:"translate(-50%,-50%)",
        boxShadow:"0 2px 8px rgba(0,0,0,.55),0 0 0 2px rgba(0,0,0,.18)"}}/>
    </div>
  );
}

/* ─── Scène knopjes (gedeeld) ──────────────────────────────── */
function LHScenes({ scene, onScene, cols=6, compact=false }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:compact?5:7}}>
      {LH_SCNS.map(sc => (
        <button key={sc.id} onClick={()=>onScene(sc)} style={{
          borderRadius:compact?10:13,border:"none",cursor:"pointer",
          padding:compact?"7px 4px":"10px 6px",
          background:scene===sc.id?`color-mix(in srgb,${sc.color} 22%,${LHC.sf})`:LHC.sf,
          boxShadow:scene===sc.id?`inset 0 0 0 1.5px ${sc.color}66`:`inset 0 0 0 1px ${LHC.ln}`,
          transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:compact?4:6,
        }}>
          <div style={{width:compact?16:20,height:compact?16:20,borderRadius:"50%",
            background:`${sc.color}20`,display:"grid",placeItems:"center",
            boxShadow:`inset 0 0 0 1px ${sc.color}44`}}>
            <div style={{width:compact?6:8,height:compact?6:8,borderRadius:"50%",
              background:sc.color,boxShadow:`0 0 5px ${sc.color}`}}/>
          </div>
          <span style={{fontSize:compact?9:10,fontWeight:700,letterSpacing:.3,
            color:scene===sc.id?sc.color:"#fff"}}>{sc.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VARIANT A — BOOG-DIALS
   Links: lamplijst + helderheidssliders
   Rechts: twee arc-dials (helderheid + kleurtemp) + scènes
═══════════════════════════════════════════════════════════ */
function LightsHoodA() {
  const [lights, setLights] = useStateLH(LH_LAMPS);
  const [scene,  setScene]  = useStateLH(null);
  const [ct, setCt]         = useStateLH(0.4);

  const toggle   = id => setLights(ls=>ls.map(l=>l.id===id?{...l,on:!l.on,bri:l.on?0:.7}:l));
  const setBri   = (id,e) => {
    const r=e.currentTarget.getBoundingClientRect();
    const v=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    setLights(ls=>ls.map(l=>l.id===id?{...l,bri:v,on:v>0}:l));
  };
  const allOff   = () => setLights(ls=>ls.map(l=>({...l,on:false,bri:0})));
  const allOn    = () => setLights(ls=>ls.map(l=>({...l,on:true,bri:Math.max(l.bri,.65)})));
  const applyScn = sc => { setScene(sc.id); setCt(sc.ct); setLights(ls=>ls.map(l=>({...l,on:true,bri:.75}))); };

  const onLamps  = lights.filter(l=>l.on);
  const avgBri   = onLamps.length ? onLamps.reduce((a,l)=>a+l.bri,0)/onLamps.length : 0;

  return (
    <div className="scr" style={{background:`radial-gradient(120% 90% at 50% -8%,#16171c 0%,${LHC.bg} 55%)`,
      display:"flex",flexDirection:"column"}}>
      <LHTop title="VERLICHTING" sub={`${onLamps.length} actief`}/>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── LINKS: lamplijst ── */}
        <div style={{width:308,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"12px 16px 14px 24px",borderRight:`1px solid ${LHC.ln}`}}>
          {lights.map(l => (
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,
              padding:"9px 0",borderBottom:`1px solid ${LHC.ln}`}}>
              <button onClick={()=>toggle(l.id)} style={{background:"none",border:"none",
                cursor:"pointer",padding:2,display:"flex",flexShrink:0}}>
                <BulbIcon s={22} on={l.on}/>
              </button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"baseline",marginBottom:7}}>
                  <span style={{fontSize:12,fontWeight:700,letterSpacing:.5,
                    color:l.on?"#fff":LHC.muted}}>{l.name}</span>
                  <span style={{fontSize:10,fontWeight:700,fontVariantNumeric:"tabular-nums",
                    color:l.on?"rgba(255,255,255,.5)":LHC.muted}}>{Math.round(l.bri*100)}%</span>
                </div>
                <div onClick={e=>setBri(l.id,e)} style={{position:"relative",height:5,
                  borderRadius:2.5,background:LHC.sf2,cursor:"pointer"}}>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2.5,
                    width:`${l.bri*100}%`,
                    background:l.on?`linear-gradient(90deg,rgba(245,180,90,.4),${LHC.amber})`:"rgba(255,255,255,.1)"}}/>
                  <div style={{position:"absolute",top:"50%",left:`${l.bri*100}%`,
                    width:11,height:11,borderRadius:"50%",
                    background:l.on?LHC.amber:"rgba(255,255,255,.22)",
                    transform:"translate(-50%,-50%)",
                    boxShadow:l.on?`0 0 8px ${LHC.amber}66`:"none"}}/>
                </div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:9,marginTop:"auto",paddingTop:12}}>
            <button onClick={allOff} style={{flex:1,height:36,borderRadius:10,
              border:`1px solid ${LHC.ln}`,background:LHC.sf2,
              color:"rgba(255,255,255,.5)",fontFamily:"Montserrat,sans-serif",
              fontSize:10,fontWeight:700,letterSpacing:1.5,cursor:"pointer"}}>ALLE UIT</button>
            <button onClick={allOn} style={{flex:1,height:36,borderRadius:10,
              border:`1px solid rgba(245,180,90,.28)`,background:"rgba(245,180,90,.1)",
              color:LHC.amber,fontFamily:"Montserrat,sans-serif",
              fontSize:10,fontWeight:700,letterSpacing:1.5,cursor:"pointer"}}>ALLE AAN</button>
          </div>
        </div>

        {/* ── RECHTS: dials + scènes ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",
          padding:"18px 24px 16px 20px",gap:0}}>

          {/* dials rij */}
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:24}}>

            {/* Dial: Helderheid */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{position:"relative",width:170,height:170}}>
                <LHArc size={170} r={70} sw={11} pct={avgBri} color={LHC.amber}/>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:0,pointerEvents:"none"}}>
                  <span style={{fontSize:50,fontWeight:800,letterSpacing:-2.5,lineHeight:1,
                    color:avgBri>.01?LHC.amber:"rgba(255,255,255,.25)",fontVariantNumeric:"tabular-nums"}}>
                    {Math.round(avgBri*100)}
                  </span>
                  <span style={{fontSize:12,fontWeight:700,color:LHC.muted,marginTop:2}}>%</span>
                </div>
              </div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:3,color:LHC.muted,marginTop:-2}}>HELDERHEID</div>
              <LHTicks pct={avgBri} color={LHC.amber}/>
            </div>

            {/* divider */}
            <div style={{width:1,height:130,flexShrink:0,
              background:`linear-gradient(transparent,${LHC.ln},transparent)`}}/>

            {/* Dial: Kleurtemp */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{position:"relative",width:170,height:170}}>
                <LHArc size={170} r={70} sw={11} pct={ct} color={lhCtRgb(ct)}/>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:0,pointerEvents:"none"}}>
                  <span style={{fontSize:36,fontWeight:800,letterSpacing:-1.5,lineHeight:1,color:"#fff"}}>
                    {lhCtK(ct)}
                  </span>
                  <span style={{fontSize:12,fontWeight:700,color:LHC.muted,marginTop:2}}>K</span>
                  <span style={{fontSize:9,fontWeight:600,letterSpacing:.5,
                    color:"rgba(255,255,255,.36)",marginTop:5}}>{lhCtLbl(ct)}</span>
                </div>
              </div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:3,color:LHC.muted,marginTop:-2}}>KLEURTEMP</div>
              <div style={{marginTop:8}}>
                <LHCtBar ct={ct} onChange={setCt} width={170}/>
              </div>
            </div>
          </div>

          {/* scènes */}
          <div style={{flexShrink:0}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2.5,
              color:"rgba(255,255,255,.3)",marginBottom:8}}>SCÈNES</div>
            <LHScenes scene={scene} onScene={applyScn} cols={6}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VARIANT B — SEGMENT-KOLOMMEN
   5 verticale kolommen (één per lamp) met stapel-segmenten
   Onderstrip: kleurtemperatuur · scènes
═══════════════════════════════════════════════════════════ */
function LightsHoodB() {
  const [lights, setLights] = useStateLH(LH_LAMPS);
  const [scene,  setScene]  = useStateLH(null);
  const [ct, setCt]         = useStateLH(0.4);
  const SEGS = 8;

  const toggle   = id => setLights(ls=>ls.map(l=>l.id===id?{...l,on:!l.on,bri:l.on?0:.7}:l));
  const setSeg   = (id,segIdx) => {
    const v=(segIdx+1)/SEGS;
    setLights(ls=>ls.map(l=>l.id===id?{...l,bri:v,on:v>0}:l));
  };
  const applyScn = sc => { setScene(sc.id); setCt(sc.ct); setLights(ls=>ls.map(l=>({...l,on:true,bri:.75}))); };

  return (
    <div className="scr" style={{background:`radial-gradient(120% 90% at 50% -8%,#16171c 0%,${LHC.bg} 55%)`,
      display:"flex",flexDirection:"column"}}>
      <LHTop title="VERLICHTING" sub="segment weergave"/>

      {/* ── 5 kolommen ── */}
      <div style={{flex:1,display:"flex",padding:"12px 14px 0",gap:10,overflow:"hidden"}}>
        {lights.map(l => {
          const filled = l.on ? Math.ceil(l.bri*SEGS) : 0;
          return (
            <div key={l.id} style={{flex:1,display:"flex",flexDirection:"column",
              alignItems:"center",gap:8}}>
              {/* header: icon + naam */}
              <button onClick={()=>toggle(l.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                background:"none",border:"none",cursor:"pointer",padding:0}}>
                <BulbIcon s={24} on={l.on}/>
                <span style={{fontSize:8,fontWeight:700,letterSpacing:2,textTransform:"uppercase",
                  color:l.on?"#fff":LHC.muted,textWrap:"nowrap"}}>{l.name}</span>
              </button>

              {/* segmented tube */}
              <div style={{flex:1,width:"100%",background:LHC.sf,border:`1px solid ${LHC.ln}`,
                borderRadius:22,padding:"10px 8px",
                display:"flex",flexDirection:"column-reverse",gap:5,
                position:"relative",overflow:"hidden"}}>
                {/* groot % getal overlay */}
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                  justifyContent:"center",pointerEvents:"none",zIndex:1}}>
                  <span style={{fontSize:34,fontWeight:800,letterSpacing:-2,
                    color:l.on?`${LHC.amber}`:"rgba(255,255,255,.1)",
                    textShadow:l.on?`0 0 22px ${LHC.amber}55`:undefined,
                    fontVariantNumeric:"tabular-nums"}}>
                    {Math.round(l.bri*100)}
                  </span>
                </div>
                {[...Array(SEGS)].map((_,i) => {
                  const isOn = i < filled;
                  const alpha = isOn ? (.35 + (i/SEGS)*.65) : 1;
                  return (
                    <div key={i} onClick={()=>setSeg(l.id,i)}
                      style={{flex:1,borderRadius:7,cursor:"pointer",
                        background:isOn?`oklch(0.80 0.13 75 / ${alpha})`:LHC.sf2,
                        border:`1px solid ${isOn?"transparent":LHC.ln}`,
                        transition:"background .25s",minHeight:18,zIndex:2}}>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Onderstrip: CT + scènes ── */}
      <div style={{height:68,display:"flex",alignItems:"center",
        padding:"0 16px",gap:14,borderTop:`1px solid ${LHC.ln}`,flexShrink:0}}>

        {/* CT */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{fontSize:8,fontWeight:700,letterSpacing:2,color:LHC.muted}}>KLEURTEMP</span>
          <LHCtBar ct={ct} onChange={setCt} width={148}/>
          <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.6)",
            fontVariantNumeric:"tabular-nums",flexShrink:0}}>{lhCtK(ct)}K</span>
        </div>

        <div style={{width:1,height:30,background:LHC.ln,flexShrink:0}}/>

        {/* scènes */}
        <div style={{flex:1}}>
          <LHScenes scene={scene} onScene={applyScn} cols={6} compact={true}/>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VARIANT C — HYBRIDE TEGELS
   Links: 2×3 lamp-tegels met preset-knoppen
   Rechts: kleurtemp boog-dial + scène-grid
═══════════════════════════════════════════════════════════ */
function LightsHoodC() {
  const [lights, setLights] = useStateLH(LH_LAMPS);
  const [scene,  setScene]  = useStateLH(null);
  const [ct, setCt]         = useStateLH(0.4);
  const arcRef               = useRefLH(null);

  const toggle   = id => setLights(ls=>ls.map(l=>l.id===id?{...l,on:!l.on,bri:l.on?0:.7}:l));
  const setPreset= (id,v) => setLights(ls=>ls.map(l=>l.id===id?{...l,bri:v,on:v>0}:l));
  const applyScn = sc => { setScene(sc.id); setCt(sc.ct); setLights(ls=>ls.map(l=>({...l,on:true,bri:.75}))); };

  const handleArcClick = e => {
    const rect = arcRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left+rect.width/2);
    const dy = e.clientY - (rect.top+rect.height/2);
    let a = Math.atan2(dx,-dy)*180/Math.PI;
    if (a < 0) a += 360;
    if (a>=135 && a<=225) { setCt(a>180?0:1); return; }
    if (a < 225) a += 360;
    setCt(Math.max(0,Math.min(1,(a-225)/270)));
  };

  // 6th tile = "alles"
  const allOn  = lights.every(l=>l.on);
  const allTile = { id:"all", name:"Alles", on:allOn, bri: allOn ? lights.reduce((s,l)=>s+l.bri,0)/lights.length : 0 };

  return (
    <div className="scr" style={{background:`radial-gradient(120% 90% at 50% -8%,#16171c 0%,${LHC.bg} 55%)`,
      display:"flex",flexDirection:"column"}}>
      <LHTop title="VERLICHTING" sub="tegel weergave"/>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── LINKS: lamp-tegels 2×3 ── */}
        <div style={{flex:1,padding:"10px 8px 10px 14px",
          display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr 1fr",gap:8}}>
          {[...lights, allTile].map(l => (
            <div key={l.id} style={{
              background:l.on?`color-mix(in srgb,${LHC.amber} 9%,${LHC.sf})`:LHC.sf,
              border:`1.5px solid ${l.on?"rgba(245,180,90,.28)":LHC.ln}`,
              borderRadius:20,padding:"11px 13px",
              display:"flex",flexDirection:"column",gap:6,
              transition:"all .2s"}}>
              {/* header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:8,fontWeight:700,letterSpacing:2.5,
                  color:l.on?"rgba(255,255,255,.82)":LHC.muted,textTransform:"uppercase"}}>
                  {l.name}
                </span>
                <button onClick={()=>l.id==="all"
                  ? setLights(ls=>ls.map(lp=>({...lp,on:!allOn,bri:allOn?0:.7})))
                  : toggle(l.id)}
                  style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}>
                  <BulbIcon s={20} on={l.on}/>
                </button>
              </div>
              {/* groot getal */}
              <span style={{fontSize:42,fontWeight:800,letterSpacing:-2.5,lineHeight:.82,
                color:l.on?LHC.amber:"rgba(255,255,255,.15)",fontVariantNumeric:"tabular-nums"}}>
                {Math.round(l.bri*100)}<span style={{fontSize:16,fontWeight:700}}>%</span>
              </span>
              {/* preset knoppen */}
              {l.id!=="all" && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
                  {[0,25,75,100].map(pct => {
                    const active = pct===0 ? !l.on : Math.abs(l.bri*100-pct)<4;
                    return (
                      <button key={pct} onClick={()=>setPreset(l.id,pct/100)} style={{
                        height:30,borderRadius:9,border:"none",cursor:"pointer",
                        background:active?`oklch(0.80 0.13 75 / 0.2)`:LHC.sf2,
                        boxShadow:active?`inset 0 0 0 1.5px ${LHC.amber}55`:`inset 0 0 0 1px ${LHC.ln}`,
                        color:pct===0?LHC.muted:active?LHC.amber:"rgba(255,255,255,.65)",
                        fontFamily:"Montserrat,sans-serif",
                        fontSize:pct===0?16:9,fontWeight:pct===0?400:700,
                        letterSpacing:pct===0?0:.5,transition:"all .15s",
                      }}>{pct===0?"×":pct+"%"}</button>
                    );
                  })}
                </div>
              )}
              {l.id==="all" && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  <button onClick={()=>setLights(ls=>ls.map(lp=>({...lp,on:false,bri:0})))}
                    style={{height:30,borderRadius:9,border:"none",cursor:"pointer",
                      background:LHC.sf2,boxShadow:`inset 0 0 0 1px ${LHC.ln}`,
                      color:"rgba(255,255,255,.5)",fontFamily:"Montserrat,sans-serif",
                      fontSize:9,fontWeight:700,letterSpacing:.5}}>UIT</button>
                  <button onClick={()=>setLights(ls=>ls.map(lp=>({...lp,on:true,bri:.75})))}
                    style={{height:30,borderRadius:9,border:"none",cursor:"pointer",
                      background:"rgba(245,180,90,.12)",
                      boxShadow:`inset 0 0 0 1.5px ${LHC.amber}44`,
                      color:LHC.amber,fontFamily:"Montserrat,sans-serif",
                      fontSize:9,fontWeight:700,letterSpacing:.5}}>AAN</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── RECHTS: CT-boog + scènes ── */}
        <div style={{width:242,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"14px 16px 14px 10px",gap:12,borderLeft:`1px solid ${LHC.ln}`}}>

          {/* CT boog */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div ref={arcRef} onClick={handleArcClick}
              style={{position:"relative",width:156,height:156,cursor:"pointer"}}>
              <LHArc size={156} r={62} sw={9} pct={ct} color={lhCtRgb(ct)}/>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",gap:0,pointerEvents:"none"}}>
                <span style={{fontSize:30,fontWeight:800,letterSpacing:-1.5,lineHeight:1,
                  color:"#fff"}}>{lhCtK(ct)}</span>
                <span style={{fontSize:9,fontWeight:600,color:LHC.muted,marginTop:3}}>K</span>
                <span style={{fontSize:8,fontWeight:600,letterSpacing:.8,
                  color:"rgba(255,255,255,.35)",marginTop:5}}>{lhCtLbl(ct)}</span>
              </div>
            </div>
            <div style={{fontSize:8,fontWeight:700,letterSpacing:3,color:LHC.muted}}>KLEURTEMP</div>
          </div>

          <div style={{height:1,background:LHC.ln,flexShrink:0}}/>

          {/* scènes 2×3 */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:8,fontWeight:700,letterSpacing:2.5,
              color:"rgba(255,255,255,.3)"}}>SCÈNES</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,flex:1}}>
              {LH_SCNS.map(sc => (
                <button key={sc.id} onClick={()=>applyScn(sc)} style={{
                  borderRadius:13,border:"none",cursor:"pointer",
                  padding:"10px 8px",
                  background:scene===sc.id?`color-mix(in srgb,${sc.color} 22%,${LHC.sf})`:LHC.sf,
                  boxShadow:scene===sc.id?`inset 0 0 0 1.5px ${sc.color}66`:`inset 0 0 0 1px ${LHC.ln}`,
                  transition:"all .2s",display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:6,
                }}>
                  <div style={{width:18,height:18,borderRadius:"50%",
                    background:`${sc.color}20`,display:"grid",placeItems:"center",
                    boxShadow:`inset 0 0 0 1px ${sc.color}44`}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:sc.color,
                      boxShadow:`0 0 5px ${sc.color}`}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,
                    color:scene===sc.id?sc.color:"#fff"}}>{sc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LightsHoodA, LightsHoodB, LightsHoodC });
