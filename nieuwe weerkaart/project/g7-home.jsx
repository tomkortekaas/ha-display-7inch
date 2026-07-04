// Guition 7" — Weer & Lampen v3
const { useState: useStateH, useEffect: useEffectH, useRef: useRefH } = React;

function useClock() {
  const [t, setT] = useStateH(() => new Date());
  useEffectH(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return t.toLocaleTimeString("nl-NL", { hour:"2-digit", minute:"2-digit" });
}

function Topbar({ title, clock, sub }) {
  return (
    <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 24px",borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,.85)"}}>{title}</span>
        {sub && <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.3)",letterSpacing:.5}}>{sub}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.55)",fontVariantNumeric:"tabular-nums"}}>{clock}</span>
        <span style={{width:7,height:7,borderRadius:"50%",background:"oklch(0.74 0.13 150)",
          boxShadow:"0 0 7px oklch(0.74 0.13 150 / .8)",display:"inline-block"}}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   WEERSCHERM v3  —  hero strip · uurstrip · 5-daagse
══════════════════════════════════════════════════ */
const DAYS   = ["Ma","Di","Wo","Do","Vr"];
const HI     = [21, 18, 24, 22, 19];
const LO     = [13, 11, 14, 15, 12];
const COND   = ["sun","cloud","sun","cloud","rain"];
const HOURS  = [
  {h:"Nu", t:19, c:"sun"},  {h:"13h",t:20,c:"sun"},  {h:"14h",t:20,c:"cloud"},
  {h:"15h",t:19,c:"cloud"}, {h:"16h",t:18,c:"cloud"},{h:"17h",t:17,c:"rain"},
  {h:"18h",t:16,c:"rain"},  {h:"19h",t:15,c:"cloud"},
];
const GLOB_LO=10, GLOB_HI=26;
const tClr = t => { const f=Math.max(0,Math.min(1,(t-GLOB_LO)/(GLOB_HI-GLOB_LO))); const r=Math.round(58+f*181),g=Math.round(120),b=Math.round(210-f*144); return `rgb(${r},${g},${b})`; };

function CondIcon({ c, s=22 }) {
  if (c==="rain")  return <RainIcon  s={s}/>;
  if (c==="cloud") return <CloudIcon s={s}/>;
  return <SunIcon s={s}/>;
}

function WeatherScreen() {
  const clock = useClock();
  const uv = 3;
  return (
    <div className="scr" style={{background:"radial-gradient(120% 90% at 50% -8%,#16171c 0%,#08080a 55%)",display:"flex",flexDirection:"column"}}>
      <Topbar title="THUIS" clock={clock} sub="Maastricht"/>

      {/* ── HERO STRIP ── */}
      <div style={{display:"flex",alignItems:"center",padding:"14px 24px 14px 28px",
        borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0,gap:20}}>
        {/* icon + bloom */}
        <div style={{position:"relative",width:72,height:72,display:"grid",placeItems:"center",flexShrink:0}}>
          <div style={{position:"absolute",inset:"-30%",borderRadius:"50%",
            background:"radial-gradient(circle,rgba(245,180,90,.22) 0%,transparent 68%)",filter:"blur(10px)"}}/>
          <div style={{position:"relative",zIndex:1}}><SunIcon s={52} color="#F5B45A"/></div>
        </div>
        {/* temp + cond */}
        <div style={{flexShrink:0}}>
          <div style={{fontSize:66,fontWeight:800,letterSpacing:-4,lineHeight:.88,fontVariantNumeric:"tabular-nums",display:"flex",alignItems:"flex-start"}}>
            19<span style={{fontSize:28,fontWeight:600,verticalAlign:"super",letterSpacing:0}}>°C</span>
          </div>
          <div style={{fontSize:14,fontWeight:700,marginTop:5}}>Gedeeltelijk bewolkt</div>
        </div>
        {/* divider */}
        <div style={{width:1,height:52,background:"rgba(255,255,255,.1)",flexShrink:0,margin:"0 4px"}}/>
        {/* stat chips */}
        <div style={{flex:1,display:"flex",gap:10,flexWrap:"wrap"}}>
          {[
            {l:"WIND",    v:"ZW 14 km/h"},
            {l:"VOCHTIG", v:"62%"},
            {l:"GEVOELS", v:"17°C"},
            {l:"UV-INDEX",v:"3 · Matig"},
            {l:"ZICHT",   v:"9 km"},
            {l:"NEERSLAG",v:"0 mm"},
          ].map(({l,v}) => (
            <div key={l} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",
              borderRadius:10,padding:"5px 10px",flexShrink:0}}>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:1.5,color:"rgba(255,255,255,.4)"}}>{l}</div>
              <div style={{fontSize:12,fontWeight:700,marginTop:1}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── UURSTRIP ── */}
      <div style={{display:"flex",alignItems:"stretch",borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0}}>
        {HOURS.map((h,i) => (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
            padding:"9px 4px 8px",borderRight: i<HOURS.length-1?"1px solid rgba(255,255,255,.05)":"none",
            background: i===0?"rgba(255,255,255,.04)":"transparent"}}>
            <span style={{fontSize:10,fontWeight:i===0?700:600,letterSpacing:.3,
              color:i===0?"#fff":"rgba(255,255,255,.5)"}}>{h.h}</span>
            <div style={{margin:"6px 0"}}><CondIcon c={h.c} s={18}/></div>
            <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums",color:tClr(h.t)}}>{h.t}°</span>
          </div>
        ))}
      </div>

      {/* ── 5-DAAGSE ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"space-evenly",
        padding:"4px 28px 8px 28px"}}>
        {DAYS.map((day,i) => {
          const pLo = ((LO[i]-GLOB_LO)/(GLOB_HI-GLOB_LO))*100;
          const pHi = ((HI[i]-GLOB_LO)/(GLOB_HI-GLOB_LO))*100;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:14}}>
              <span style={{width:28,fontSize:12,fontWeight:700,letterSpacing:.3,
                color:i===0?"#fff":"rgba(255,255,255,.75)"}}>{day}</span>
              <CondIcon c={COND[i]} s={18}/>
              <span style={{width:28,textAlign:"right",fontSize:11,fontWeight:600,
                color:"rgba(255,255,255,.45)",fontVariantNumeric:"tabular-nums"}}>{LO[i]}°</span>
              <div style={{flex:1,position:"relative",height:6,borderRadius:3,background:"#1b1c21"}}>
                <div style={{position:"absolute",height:"100%",borderRadius:3,
                  left:pLo+"%", width:(pHi-pLo)+"%",
                  background:`linear-gradient(90deg,${tClr(LO[i])},${tClr(HI[i])})`}}/>
                {i===0 && <div style={{position:"absolute",top:"50%",left:"42%",width:8,height:8,
                  borderRadius:"50%",background:"#fff",transform:"translate(-50%,-50%)",
                  boxShadow:"0 0 5px rgba(255,255,255,.8)"}}/>}
              </div>
              <span style={{width:30,fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums",
                color:tClr(HI[i])}}>{HI[i]}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LAMPEN & SCÈNES v3
   Links: per-lamp toggle + brightness
   Rechts: kleurtemperatuur slider + scènes grid
══════════════════════════════════════════════════ */
const LIGHTS_INIT = [
  {id:"wk",  name:"Woonkamer",  on:true,  bri:0.78, ct:0.4},
  {id:"sl",  name:"Slaapkamer", on:false, bri:0,    ct:0.8},
  {id:"keu", name:"Keuken",     on:true,  bri:0.22, ct:0.1},
  {id:"hal", name:"Hal",        on:true,  bri:0.55, ct:0.5},
  {id:"bad", name:"Badkamer",   on:false, bri:0,    ct:0.3},
];
const SCENES = [
  {id:"avond",  label:"Avond",    color:"#F5B45A", ct:0.85},
  {id:"werk",   label:"Werk",     color:"#78B4EB", ct:0.1},
  {id:"film",   label:"Film",     color:"#9678EB", ct:0.9},
  {id:"nacht",  label:"Nacht",    color:"#5A6EB4", ct:1.0},
  {id:"lees",   label:"Lees",     color:"#AAEABB", ct:0.3},
  {id:"feest",  label:"Feest",    color:"#EB5A96", ct:0.5},
];

function LightsScreen() {
  const clock = useClock();
  const [lights, setLights] = useStateH(LIGHTS_INIT);
  const [activeScene, setActiveScene] = useStateH(null);
  const ctRef = useRefH(null);

  // global kleurtemperatuur (voor alle actieve lampen)
  const avgCt = lights.filter(l=>l.on).reduce((a,l,_,arr) => a + l.ct/arr.length, 0) || 0.4;
  const [globalCt, setGlobalCt] = useStateH(avgCt);

  const toggle  = id => setLights(ls => ls.map(l => l.id===id ? {...l, on:!l.on, bri:l.on?0:0.65} : l));
  const setBri  = (id,e) => { const r=e.currentTarget.getBoundingClientRect(); const v=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)); setLights(ls=>ls.map(l=>l.id===id?{...l,bri:v,on:v>0}:l)); };
  const allOn   = () => setLights(ls=>ls.map(l=>({...l,on:true,bri:Math.max(l.bri,0.6)})));
  const allOff  = () => setLights(ls=>ls.map(l=>({...l,on:false,bri:0})));
  const applyScene = sc => {
    setActiveScene(sc.id); setGlobalCt(sc.ct);
    setLights(ls=>ls.map(l=>({...l,on:true,bri:0.75,ct:sc.ct})));
  };
  const setCt = e => { const r=ctRef.current.getBoundingClientRect(); setGlobalCt(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))); };
  const ctLabel = globalCt < .25 ? "Koel wit" : globalCt < .55 ? "Neutraal" : globalCt < .8 ? "Warm wit" : "Extra warm";
  const ctK = Math.round(6500 - globalCt * 4000);

  return (
    <div className="scr" style={{background:"radial-gradient(120% 90% at 50% -8%,#16171c 0%,#08080a 55%)",display:"flex",flexDirection:"column"}}>
      <Topbar title="VERLICHTING" clock={clock}/>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* ── LEFT: lichten ── */}
        <div style={{width:356,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"12px 16px 12px 22px",borderRight:"1px solid rgba(255,255,255,.07)"}}>
          {lights.map(l => (
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,
              padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
              <button onClick={()=>toggle(l.id)} style={{background:"none",border:"none",
                cursor:"pointer",padding:2,display:"flex",flexShrink:0}}>
                <BulbIcon s={22} on={l.on}/>
              </button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:l.on?"#fff":"rgba(255,255,255,.4)"}}>{l.name}</span>
                  <span style={{fontSize:10,fontWeight:600,fontVariantNumeric:"tabular-nums",
                    color:l.on?"rgba(255,255,255,.55)":"rgba(255,255,255,.22)"}}>{Math.round(l.bri*100)}%</span>
                </div>
                <div onClick={e=>setBri(l.id,e)} style={{position:"relative",height:5,borderRadius:2.5,
                  background:"#1b1c21",cursor:"pointer"}}>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2.5,
                    width:l.bri*100+"%",
                    background:l.on?`linear-gradient(90deg,rgba(245,180,90,.4),#F5B45A)`:"rgba(255,255,255,.12)"}}/>
                  <div style={{position:"absolute",top:"50%",left:l.bri*100+"%",width:11,height:11,
                    borderRadius:"50%",background:l.on?"#F5B45A":"rgba(255,255,255,.25)",
                    transform:"translate(-50%,-50%)",
                    boxShadow:l.on?"0 0 7px rgba(245,180,90,.55)":"none"}}/>
                </div>
              </div>
            </div>
          ))}
          {/* alle knoppen */}
          <div style={{display:"flex",gap:10,marginTop:"auto",paddingTop:10}}>
            <button onClick={allOff} style={{flex:1,height:38,borderRadius:10,
              border:"1px solid rgba(255,255,255,.1)",background:"#1b1c21",
              color:"rgba(255,255,255,.6)",fontFamily:"Montserrat,sans-serif",
              fontSize:12,fontWeight:700,cursor:"pointer"}}>Alle uit</button>
            <button onClick={allOn} style={{flex:1,height:38,borderRadius:10,border:"none",
              background:"rgba(245,180,90,.15)",color:"#F5B45A",
              fontFamily:"Montserrat,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",
              boxShadow:"inset 0 0 0 1px rgba(245,180,90,.28)"}}>Alle aan</button>
          </div>
        </div>

        {/* ── RIGHT: kleurtemp + scènes ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 22px 14px 18px",gap:0}}>

          {/* kleurtemperatuur */}
          <div style={{flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:2.5,color:"rgba(255,255,255,.4)"}}>KLEURTEMPERATUUR</span>
              <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.7)"}}>
                <span style={{color:"rgba(255,255,255,.42)",fontWeight:600,marginRight:6}}>{ctLabel}</span>{ctK}K
              </span>
            </div>
            <div ref={ctRef} onClick={setCt} style={{position:"relative",height:12,borderRadius:6,cursor:"pointer",
              background:"linear-gradient(90deg,#78B4EB 0%,#fff 35%,#FFF4E0 60%,#F5B45A 80%,#E8821A 100%)",
              boxShadow:"0 2px 8px rgba(0,0,0,.4)"}}>
              <div style={{position:"absolute",top:"50%",left:globalCt*100+"%",width:18,height:18,
                borderRadius:"50%",background:"#fff",transform:"translate(-50%,-50%)",
                boxShadow:"0 2px 8px rgba(0,0,0,.5),0 0 0 2px rgba(0,0,0,.2)"}}/>
            </div>
          </div>

          <div style={{height:1,background:"rgba(255,255,255,.07)",margin:"14px 0",flexShrink:0}}/>

          {/* scènes */}
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2.5,color:"rgba(255,255,255,.4)",marginBottom:10,flexShrink:0}}>SCÈNES</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,flex:1}}>
            {SCENES.map(sc => (
              <button key={sc.id} onClick={()=>applyScene(sc)}
                style={{borderRadius:14,border:"none",cursor:"pointer",
                  padding:"12px 10px",textAlign:"left",
                  background: activeScene===sc.id
                    ? `color-mix(in srgb,${sc.color} 20%,#1b1c21)`
                    : "#131418",
                  boxShadow: activeScene===sc.id
                    ? `inset 0 0 0 1.5px ${sc.color}55, 0 4px 16px ${sc.color}20`
                    : "inset 0 0 0 1px rgba(255,255,255,.07)",
                  transition:"all .2s",display:"flex",flexDirection:"column",gap:7}}>
                <div style={{width:28,height:28,borderRadius:"50%",
                  background:`${sc.color}22`,display:"grid",placeItems:"center",
                  boxShadow:`inset 0 0 0 1px ${sc.color}44`}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:sc.color,
                    boxShadow:`0 0 6px ${sc.color}`}}/>
                </div>
                <span style={{fontSize:12,fontWeight:700,
                  color: activeScene===sc.id ? sc.color : "#fff"}}>{sc.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WeatherScreen, LightsScreen });
