// Guition 7" — Drie iOS-stijl weervarianten
const { useState: useStateW, useEffect: useEffectW } = React;

function useClockW() {
  const [t, setT] = useStateW(() => new Date());
  useEffectW(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return t.toLocaleTimeString("nl-NL", { hour:"2-digit", minute:"2-digit" });
}

// Weerdata
const W_DAYS  = ["Ma","Di","Wo","Do","Vr"];
const W_HI    = [21, 18, 24, 22, 19];
const W_LO    = [13, 11, 14, 15, 12];
const W_COND  = ["sun","cloud","sun","cloud","rain"];
const W_HOURS = [
  {h:"Nu",  t:19, c:"sun"},  {h:"13h", t:20, c:"sun"},  {h:"14h", t:20, c:"cloud"},
  {h:"15h", t:19, c:"cloud"},{h:"16h", t:18, c:"cloud"},{h:"17h", t:17, c:"rain"},
  {h:"18h", t:16, c:"rain"}, {h:"19h", t:15, c:"cloud"},
];
const W_LO_G = 10, W_HI_G = 26;

function WIcon({ c, s=20 }) {
  if (c === "rain")  return <RainIcon  s={s}/>;
  if (c === "cloud") return <CloudIcon s={s}/>;
  return <SunIcon s={s}/>;
}

/* ═══════════════════════════════════════════════════════════
   VARIANT A — "Zonnig"
   Heldere dag · azure gradiënt · hero links · glas rechts
═══════════════════════════════════════════════════════════ */
function WeatherIosA() {
  const clock = useClockW();
  return (
    <div className="scr" style={{
      background:"linear-gradient(162deg,#1554a8 0%,#1e73ce 32%,#3a9de0 64%,#65bef2 100%)",
      display:"flex", overflow:"hidden"
    }}>

      {/* ── LINKS: hero ── */}
      <div style={{width:330, flexShrink:0, display:"flex", flexDirection:"column",
        padding:"22px 20px 22px 26px", justifyContent:"space-between"}}>

        {/* stad + tijd */}
        <div>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:3.5,
            color:"rgba(255,255,255,.88)", textTransform:"uppercase"}}>Maastricht</div>
          <div style={{fontSize:10, fontWeight:500, color:"rgba(255,255,255,.46)",
            marginTop:3}}>{clock} · Zaterdag</div>
        </div>

        {/* mega temp */}
        <div>
          <div style={{position:"relative", display:"inline-block"}}>
            {/* glow */}
            <div style={{position:"absolute", inset:"-40%", borderRadius:"50%",
              background:"radial-gradient(circle,rgba(255,200,80,.22) 0%,transparent 65%)",
              filter:"blur(16px)", pointerEvents:"none"}}/>
            <div style={{position:"relative", display:"flex", alignItems:"flex-start", lineHeight:.88}}>
              <span style={{fontSize:110, fontWeight:800, letterSpacing:-6,
                color:"#fff", textShadow:"0 6px 40px rgba(0,40,120,.2)"}}>19</span>
              <span style={{fontSize:38, fontWeight:600, marginTop:14,
                color:"rgba(255,255,255,.85)"}}>°</span>
            </div>
          </div>
          <div style={{fontSize:15, fontWeight:600, color:"rgba(255,255,255,.9)",
            marginTop:2}}>Helder en zonnig</div>
          <div style={{fontSize:12, fontWeight:500, color:"rgba(255,255,255,.55)",
            marginTop:3, letterSpacing:.3}}>H:24° &nbsp; L:13°</div>
        </div>

        {/* stat pills */}
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          {[
            {l:"WIND",    v:"ZW 14"},
            {l:"VOCHTIG", v:"62%"},
            {l:"GEVOELS", v:"17°"},
            {l:"UV",      v:"3"},
          ].map(({l,v}) => (
            <div key={l} style={{
              background:"rgba(255,255,255,.22)", backdropFilter:"blur(14px)",
              border:"1px solid rgba(255,255,255,.32)", borderRadius:12,
              padding:"5px 11px"
            }}>
              <div style={{fontSize:8, fontWeight:700, letterSpacing:1.6,
                color:"rgba(255,255,255,.6)"}}>{l}</div>
              <div style={{fontSize:13, fontWeight:700, color:"#fff"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECHTS: glas panel ── */}
      <div style={{
        flex:1, margin:"13px 13px 13px 0",
        background:"rgba(255,255,255,.18)", backdropFilter:"blur(28px)",
        borderRadius:24, border:"1px solid rgba(255,255,255,.3)",
        display:"flex", flexDirection:"column", overflow:"hidden"
      }}>

        {/* uurstrip */}
        <div style={{display:"flex", padding:"10px 7px",
          borderBottom:"1px solid rgba(255,255,255,.18)", flexShrink:0}}>
          {W_HOURS.map((h,i) => (
            <div key={i} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5,
              background: i===0?"rgba(255,255,255,.24)":"transparent",
              borderRadius:14, padding:"6px 3px"
            }}>
              <span style={{fontSize:10, fontWeight:i===0?700:500,
                color:i===0?"#fff":"rgba(255,255,255,.68)"}}>{h.h}</span>
              <WIcon c={h.c} s={17}/>
              <span style={{fontSize:13, fontWeight:700, color:"#fff",
                fontVariantNumeric:"tabular-nums"}}>{h.t}°</span>
            </div>
          ))}
        </div>

        {/* 5-daagse */}
        <div style={{flex:1, display:"flex", flexDirection:"column",
          justifyContent:"space-evenly", padding:"6px 18px"}}>
          {W_DAYS.map((day,i) => {
            const pLo = ((W_LO[i]-W_LO_G)/(W_HI_G-W_LO_G))*100;
            const pHi = ((W_HI[i]-W_LO_G)/(W_HI_G-W_LO_G))*100;
            return (
              <div key={i} style={{display:"flex", alignItems:"center", gap:10}}>
                <span style={{width:26, fontSize:12, fontWeight:600,
                  color:i===0?"#fff":"rgba(255,255,255,.75)"}}>{day}</span>
                <WIcon c={W_COND[i]} s={17}/>
                <span style={{width:24, textAlign:"right", fontSize:11, fontWeight:600,
                  color:"rgba(255,255,255,.45)", fontVariantNumeric:"tabular-nums"}}>{W_LO[i]}°</span>
                <div style={{flex:1, position:"relative", height:5, borderRadius:3,
                  background:"rgba(255,255,255,.2)"}}>
                  <div style={{
                    position:"absolute", height:"100%", borderRadius:3,
                    left:pLo+"%", width:(pHi-pLo)+"%",
                    background:"linear-gradient(90deg,rgba(255,255,255,.5),rgba(255,255,255,.92))"
                  }}/>
                  {i===0 && <div style={{position:"absolute", top:"50%", left:"40%",
                    width:8, height:8, borderRadius:"50%", background:"#fff",
                    transform:"translate(-50%,-50%)",
                    boxShadow:"0 0 7px rgba(255,255,255,.9)"}}/>}
                </div>
                <span style={{width:26, fontSize:12, fontWeight:700, color:"#fff",
                  fontVariantNumeric:"tabular-nums"}}>{W_HI[i]}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VARIANT B — "Avond"
   Zonsondergang · paars-oranje · gecentreerde hero · onderstrip
═══════════════════════════════════════════════════════════ */
function WeatherIosB() {
  const clock = useClockW();
  return (
    <div className="scr" style={{
      background:"linear-gradient(170deg,#160e35 0%,#2e1c5a 22%,#6e2e5e 50%,#c25840 78%,#e8864a 100%)",
      display:"flex", flexDirection:"column", overflow:"hidden"
    }}>

      {/* ── TOP: stad + tijd ── */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        padding:"18px 28px 0", flexShrink:0}}>
        <div>
          <div style={{fontSize:13, fontWeight:700, letterSpacing:2.8,
            color:"rgba(255,255,255,.9)"}}>MAASTRICHT</div>
          <div style={{fontSize:10, fontWeight:500, color:"rgba(255,255,255,.42)",
            marginTop:2}}>Zaterdag</div>
        </div>
        <span style={{fontSize:14, fontWeight:600, color:"rgba(255,255,255,.55)",
          fontVariantNumeric:"tabular-nums"}}>{clock}</span>
      </div>

      {/* ── MIDDEN: icon + temp + stats ── */}
      <div style={{flex:1, display:"flex", alignItems:"center",
        justifyContent:"center", gap:28, padding:"0 24px"}}>

        {/* cloud icon met glow */}
        <div style={{position:"relative", flexShrink:0}}>
          <div style={{position:"absolute", inset:"-55%", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(194,88,64,.4) 0%,transparent 65%)",
            filter:"blur(18px)"}}/>
          <CloudIcon s={68} color="rgba(255,255,255,.82)"/>
        </div>

        {/* temp */}
        <div>
          <div style={{display:"flex", alignItems:"flex-start"}}>
            <span style={{fontSize:104, fontWeight:800, letterSpacing:-5.5,
              color:"#fff", lineHeight:.88}}>17</span>
            <span style={{fontSize:34, fontWeight:600, marginTop:12,
              color:"rgba(255,255,255,.8)"}}>°C</span>
          </div>
          <div style={{fontSize:16, fontWeight:600, color:"rgba(255,255,255,.88)",
            marginTop:4}}>Bewolkt</div>
          <div style={{fontSize:12, fontWeight:500, color:"rgba(255,255,255,.5)",
            marginTop:2}}>H:21° &nbsp; L:13°</div>
        </div>

        {/* stats kolom */}
        <div style={{display:"flex", flexDirection:"column", gap:7, marginLeft:4}}>
          {[
            {l:"NEERSLAG", v:"0 mm"},
            {l:"WIND",     v:"ZW 14 km/h"},
            {l:"GEVOELS",  v:"15°C"},
            {l:"VOCHTIG",  v:"68%"},
          ].map(({l,v}) => (
            <div key={l} style={{
              background:"rgba(0,0,0,.25)", backdropFilter:"blur(14px)",
              border:"1px solid rgba(255,255,255,.12)", borderRadius:12,
              padding:"5px 13px", display:"flex", alignItems:"baseline", gap:10
            }}>
              <span style={{fontSize:8, fontWeight:700, letterSpacing:1.5,
                color:"rgba(255,200,140,.55)", width:54, flexShrink:0}}>{l}</span>
              <span style={{fontSize:12, fontWeight:700,
                color:"rgba(255,255,255,.9)"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ONDER: uurstrip + 5-daagse naast elkaar ── */}
      <div style={{padding:"0 12px 12px", display:"flex", gap:9, flexShrink:0}}>

        {/* uurstrip */}
        <div style={{
          flex:1, background:"rgba(0,0,0,.3)", backdropFilter:"blur(26px)",
          borderRadius:20, border:"1px solid rgba(255,255,255,.13)",
          display:"flex", padding:"8px 6px"
        }}>
          {W_HOURS.map((h,i) => (
            <div key={i} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              background:i===0?"rgba(255,255,255,.14)":"transparent",
              borderRadius:13, padding:"5px 2px"
            }}>
              <span style={{fontSize:10, fontWeight:i===0?700:500,
                color:i===0?"#fff":"rgba(255,255,255,.52)"}}>{h.h}</span>
              <WIcon c={h.c} s={15}/>
              <span style={{fontSize:12, fontWeight:700, color:"#fff",
                fontVariantNumeric:"tabular-nums"}}>{h.t}°</span>
            </div>
          ))}
        </div>

        {/* 5-daagse compact */}
        <div style={{
          width:210, background:"rgba(0,0,0,.3)", backdropFilter:"blur(26px)",
          borderRadius:20, border:"1px solid rgba(255,255,255,.13)",
          display:"flex", flexDirection:"column", justifyContent:"space-evenly",
          padding:"6px 14px"
        }}>
          {W_DAYS.map((day,i) => {
            const pLo = ((W_LO[i]-W_LO_G)/(W_HI_G-W_LO_G))*100;
            const pHi = ((W_HI[i]-W_LO_G)/(W_HI_G-W_LO_G))*100;
            return (
              <div key={i} style={{display:"flex", alignItems:"center", gap:7}}>
                <span style={{width:22, fontSize:11, fontWeight:600,
                  color:i===0?"#fff":"rgba(255,255,255,.68)"}}>{day}</span>
                <WIcon c={W_COND[i]} s={14}/>
                <span style={{width:20, textAlign:"right", fontSize:10,
                  color:"rgba(255,255,255,.38)", fontVariantNumeric:"tabular-nums"}}>{W_LO[i]}°</span>
                <div style={{flex:1, position:"relative", height:4, borderRadius:2,
                  background:"rgba(255,255,255,.13)"}}>
                  <div style={{
                    position:"absolute", height:"100%", borderRadius:2,
                    left:pLo+"%", width:(pHi-pLo)+"%",
                    background:"linear-gradient(90deg,rgba(194,88,64,.75),rgba(232,134,74,.95))"
                  }}/>
                </div>
                <span style={{width:22, fontSize:11, fontWeight:700, color:"#fff",
                  fontVariantNumeric:"tabular-nums"}}>{W_HI[i]}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VARIANT C — "Nacht / Regen"
   Diep nachtblauw · regenanimatie · glas kaarten
═══════════════════════════════════════════════════════════ */
function WeatherIosC() {
  const clock = useClockW();
  return (
    <div className="scr" style={{
      background:"linear-gradient(168deg,#090f1a 0%,#0c1828 40%,#0f2038 70%,#112548 100%)",
      display:"flex", overflow:"hidden", position:"relative"
    }}>

      {/* ── REGEN animatie ── */}
      <style>{`
        @keyframes wRain {
          from { transform: translateY(-30px) rotate(10deg); opacity:.65; }
          to   { transform: translateY(510px) rotate(10deg); opacity:0; }
        }
      `}</style>
      {[...Array(28)].map((_,i) => (
        <div key={i} style={{
          position:"absolute",
          left: ((i * 3.7 + (i%5) * 1.2)) + "%",
          top:-28, width:1.5,
          height: 8 + (i%5)*5,
          borderRadius:2,
          background:"rgba(120,180,255,.3)",
          animation:`wRain ${1.1+(i%6)*.15}s linear infinite`,
          animationDelay:`${(i*.09)%1.6}s`,
          zIndex:0, pointerEvents:"none"
        }}/>
      ))}

      <div style={{position:"relative", zIndex:1, display:"flex", width:"100%", height:"100%"}}>

        {/* ── LINKS: hero ── */}
        <div style={{width:340, flexShrink:0, display:"flex", flexDirection:"column",
          padding:"18px 20px 18px 26px", justifyContent:"space-between"}}>

          {/* stad */}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:3.5,
                color:"rgba(255,255,255,.75)", textTransform:"uppercase"}}>Maastricht</div>
              <div style={{fontSize:10, fontWeight:500, color:"rgba(255,255,255,.38)",
                marginTop:2}}>Zaterdag · nacht</div>
            </div>
            <span style={{fontSize:12, fontWeight:600, color:"rgba(255,255,255,.38)",
              fontVariantNumeric:"tabular-nums"}}>{clock}</span>
          </div>

          {/* temp */}
          <div>
            <div style={{display:"flex", alignItems:"flex-start", lineHeight:.88}}>
              <span style={{fontSize:108, fontWeight:800, letterSpacing:-5.5,
                color:"#fff", textShadow:"0 0 60px rgba(100,160,255,.15)"}}>15</span>
              <span style={{fontSize:34, fontWeight:600, marginTop:13,
                color:"rgba(255,255,255,.65)"}}>°</span>
            </div>
            <div style={{fontSize:15, fontWeight:600, color:"rgba(120,180,255,.92)",
              marginTop:4}}>Regen</div>
            <div style={{fontSize:12, fontWeight:500, color:"rgba(255,255,255,.42)",
              marginTop:3}}>H:18° &nbsp; L:11°</div>
          </div>

          {/* stats grid */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7}}>
            {[
              {l:"NEERSLAG", v:"4.2 mm"},
              {l:"WIND",     v:"Z 22 km/h"},
              {l:"GEVOELS",  v:"13°C"},
              {l:"VOCHTIG",  v:"82%"},
              {l:"KANS",     v:"85%"},
              {l:"ZICHT",    v:"6 km"},
            ].map(({l,v}) => (
              <div key={l} style={{
                background:"rgba(255,255,255,.07)", backdropFilter:"blur(12px)",
                border:"1px solid rgba(255,255,255,.1)", borderRadius:12,
                padding:"6px 10px"
              }}>
                <div style={{fontSize:8, fontWeight:700, letterSpacing:1.5,
                  color:"rgba(120,180,255,.5)"}}>{l}</div>
                <div style={{fontSize:12, fontWeight:700, color:"rgba(255,255,255,.9)",
                  marginTop:1}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RECHTS: glas kaarten ── */}
        <div style={{flex:1, display:"flex", flexDirection:"column",
          gap:9, padding:"13px 13px 13px 0"}}>

          {/* uurstrip glas */}
          <div style={{
            flexShrink:0,
            background:"rgba(255,255,255,.07)", backdropFilter:"blur(22px)",
            borderRadius:22, border:"1px solid rgba(255,255,255,.1)",
            display:"flex", padding:"10px 6px"
          }}>
            {W_HOURS.map((h,i) => (
              <div key={i} style={{
                flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                background:i===0?"rgba(120,180,255,.14)":"transparent",
                borderRadius:14, padding:"6px 3px"
              }}>
                <span style={{fontSize:10, fontWeight:i===0?700:500,
                  color:i===0?"rgba(140,200,255,1)":"rgba(255,255,255,.45)"}}>{h.h}</span>
                <WIcon c={h.c} s={16}/>
                <span style={{fontSize:12, fontWeight:700, color:"#fff",
                  fontVariantNumeric:"tabular-nums"}}>{h.t}°</span>
              </div>
            ))}
          </div>

          {/* 5-daagse glas */}
          <div style={{
            flex:1,
            background:"rgba(255,255,255,.07)", backdropFilter:"blur(22px)",
            borderRadius:22, border:"1px solid rgba(255,255,255,.1)",
            display:"flex", flexDirection:"column", justifyContent:"space-evenly",
            padding:"8px 18px"
          }}>
            {W_DAYS.map((day,i) => {
              const pLo = ((W_LO[i]-W_LO_G)/(W_HI_G-W_LO_G))*100;
              const pHi = ((W_HI[i]-W_LO_G)/(W_HI_G-W_LO_G))*100;
              return (
                <div key={i} style={{display:"flex", alignItems:"center", gap:10}}>
                  <span style={{width:26, fontSize:12, fontWeight:600,
                    color:i===0?"rgba(140,200,255,1)":"rgba(255,255,255,.72)"}}>{day}</span>
                  <WIcon c={W_COND[i]} s={17}/>
                  <span style={{width:24, textAlign:"right", fontSize:11, fontWeight:600,
                    color:"rgba(255,255,255,.32)", fontVariantNumeric:"tabular-nums"}}>{W_LO[i]}°</span>
                  <div style={{flex:1, position:"relative", height:5, borderRadius:3,
                    background:"rgba(255,255,255,.1)"}}>
                    <div style={{
                      position:"absolute", height:"100%", borderRadius:3,
                      left:pLo+"%", width:(pHi-pLo)+"%",
                      background:"linear-gradient(90deg,rgba(80,140,230,.65),rgba(140,200,255,.95))"
                    }}/>
                    {i===0 && <div style={{position:"absolute", top:"50%", left:"40%",
                      width:8, height:8, borderRadius:"50%",
                      background:"rgba(160,215,255,1)", transform:"translate(-50%,-50%)",
                      boxShadow:"0 0 9px rgba(140,200,255,.9)"}}/>}
                  </div>
                  <span style={{width:26, fontSize:12, fontWeight:700,
                    color:"rgba(255,255,255,.88)", fontVariantNumeric:"tabular-nums"}}>{W_HI[i]}°</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WeatherIosA, WeatherIosB, WeatherIosC });
