// g7-calendar-week.jsx — Week view varianten · drie layouts · Guition 7″ 800×480
const { useState: useWS, useEffect: useWE } = React;

function useWVClock() {
  const [t, setT] = useWS(() => new Date());
  useWE(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return t.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

/* ── data ─────────────────────────────────────────────── */
const WV_FAM = [
  { id:"papa",  label:"Papa",  color:"#5A96EB" },
  { id:"mama",  label:"Mama",  color:"#F5B45A" },
  { id:"emma",  label:"Emma",  color:"#9678EB" },
  { id:"lotte", label:"Lotte", color:"#4ADE80" },
];

const WV_EVS = [
  { day:18, time:"07:30", dur:30,  title:"Standup",         who:"papa",  allDay:false },
  { day:18, time:"09:00", dur:60,  title:"Yoga",            who:"mama",  allDay:false },
  { day:18, time:"14:30", dur:45,  title:"Tandarts",        who:"lotte", allDay:false },
  { day:18, time:"16:00", dur:90,  title:"Zwemles",         who:"emma",  allDay:false },
  { day:18, time:"18:30", dur:120, title:"Eten bij opa",    who:"all",   allDay:false },
  { day:19, time:"08:00", dur:540, title:"Schoolfeest",     who:"emma",  allDay:true  },
  { day:19, time:"19:00", dur:90,  title:"Buurtverg.",      who:"papa",  allDay:false },
  { day:20, time:"14:00", dur:120, title:"Voetbal",         who:"lotte", allDay:false },
  { day:21, time:"11:00", dur:60,  title:"Doktersafspraak", who:"papa",  allDay:false },
];

const WV_WABBR  = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const WV_WDATES = [15,16,17,18,19,20,21];
const WV_TODAY  = 18;
const WV_NOW    = "12:45";
const WV_SHOW   = [18, 19, 20, 21]; // vandaag + 3 dagen vooruit

const wvFc   = who => (WV_FAM.find(m => m.id === who) || { color:"#96AAC3" }).color;
const wvFl   = who => (WV_FAM.find(m => m.id === who) || { label:"Fam" }).label;
const wvAbbr = day  => WV_WABBR[WV_WDATES.indexOf(day)] || "–";

/* ── tijdgrid helpers ─────────────────────── */
const WV_GRID_H   = 384;   // px, hoogte van het tijdgrid
const WV_HR_START = 7;     // 07:00
const WV_HR_END   = 22;    // 22:00
const WV_HRS      = WV_HR_END - WV_HR_START; // 15 uur zichtbaar
const WV_HOUR_MARKS = [8, 10, 12, 14, 16, 18, 20];

const wvTimeY = time => {
  const [h, m] = time.split(":").map(Number);
  return ((h - WV_HR_START) + m / 60) * (WV_GRID_H / WV_HRS);
};
const wvDurH = dur => Math.max((dur / 60) * (WV_GRID_H / WV_HRS), 24);

/* ── gedeeld: topbar ─────────────────────── */
function WVTopbar({ clock, subtitle }) {
  return (
    <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 24px",borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"baseline",gap:9}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,.85)"}}>
          FAMILIE AGENDA
        </span>
        {subtitle && (
          <span style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:"rgba(255,255,255,.28)"}}>
            {subtitle}
          </span>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums",
          color:"rgba(255,255,255,.5)"}}>{clock}</span>
        <span style={{width:7,height:7,borderRadius:"50%",background:"oklch(0.74 0.13 150)",
          boxShadow:"0 0 7px oklch(0.74 0.13 150 / .8)",display:"inline-block"}}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   A — TIJDGRID  (Google Calendar-stijl, 4 kolommen)
═══════════════════════════════════════════════════════ */
function WeekTimeGrid() {
  const clock = useWVClock();
  const nowY   = wvTimeY(WV_NOW);

  return (
    <div data-screen-label="A — Tijdgrid" className="scr" style={{
      background:"radial-gradient(120% 90% at 50% -8%,#16171c 0%,#08080a 55%)",
      display:"flex",flexDirection:"column"
    }}>
      <WVTopbar clock={clock} subtitle="WO 18 – ZA 21 JUNI"/>

      {/* Dag-headers (50px) */}
      <div style={{height:50,display:"flex",borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0}}>
        {/* lege cel boven de tijdkolom */}
        <div style={{width:46,flexShrink:0}}/>
        {WV_SHOW.map(day => {
          const active   = day === WV_TODAY;
          const abbr     = wvAbbr(day);
          const allDayEv = WV_EVS.find(e => e.day === day && e.allDay);
          return (
            <div key={day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:2,borderLeft:"1px solid rgba(255,255,255,.05)"}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,
                color:active?"#fff":"rgba(255,255,255,.32)"}}>{abbr}</span>
              <div style={{width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",
                justifyContent:"center",
                background:active?"#5A96EB":"transparent",
                border:active?"none":"1px solid rgba(255,255,255,.08)"}}>
                <span style={{fontSize:13,fontWeight:active?800:600,fontVariantNumeric:"tabular-nums",
                  color:active?"#fff":"rgba(255,255,255,.55)"}}>{day}</span>
              </div>
              {allDayEv && (
                <div style={{height:6,width:"80%",borderRadius:3,
                  background:wvFc(allDayEv.who),opacity:.75}}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Tijdgrid (flex:1 = 384px) */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
        {/* Tijdlabels links */}
        <div style={{width:46,flexShrink:0,position:"relative"}}>
          {WV_HOUR_MARKS.map(h => (
            <div key={h} style={{position:"absolute",
              top:wvTimeY(`${h}:00`)-8,right:8,
              fontSize:9,fontWeight:700,color:"rgba(255,255,255,.25)",
              fontVariantNumeric:"tabular-nums",letterSpacing:.3}}>
              {h}:00
            </div>
          ))}
        </div>

        {/* Dag-kolommen */}
        {WV_SHOW.map(day => {
          const isToday = day === WV_TODAY;
          const evs = WV_EVS.filter(e => e.day === day && !e.allDay);
          return (
            <div key={day} style={{flex:1,position:"relative",overflow:"hidden",
              borderLeft:"1px solid rgba(255,255,255,.06)",
              background:isToday?"rgba(90,150,235,.03)":"transparent"}}>

              {/* Uurlijnen */}
              {WV_HOUR_MARKS.map(h => (
                <div key={h} style={{position:"absolute",
                  top:wvTimeY(`${h}:00`),left:0,right:0,height:1,
                  background:"rgba(255,255,255,.05)"}}/>
              ))}

              {/* Huidige tijd (vandaag) */}
              {isToday && (
                <div style={{position:"absolute",top:nowY,left:0,right:0,height:1.5,
                  background:"#5A96EB",zIndex:3}}>
                  <div style={{position:"absolute",left:-3,top:-3,width:7,height:7,
                    borderRadius:"50%",background:"#5A96EB",
                    boxShadow:"0 0 6px rgba(90,150,235,.7)"}}/>
                </div>
              )}

              {/* Afspraken */}
              {evs.map((ev, i) => {
                const c    = wvFc(ev.who);
                const y    = wvTimeY(ev.time);
                const h    = wvDurH(ev.dur);
                const past = ev.time <= WV_NOW && isToday;
                return (
                  <div key={i} style={{position:"absolute",
                    top:y+1,left:4,right:4,height:h-2,
                    background:`${c}1c`,
                    borderLeft:`3px solid ${c}`,
                    borderRadius:"0 6px 6px 0",
                    padding:"3px 6px",overflow:"hidden",zIndex:1,
                    opacity:past?0.42:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#fff",lineHeight:1.2,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {ev.title}
                    </div>
                    {h >= 42 && (
                      <div style={{fontSize:9,fontWeight:600,color:c,marginTop:2,
                        whiteSpace:"nowrap"}}>
                        {ev.time} · {wvFl(ev.who)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   B — DAG-STRIPS  (horizontale tijdlijn per dag)
═══════════════════════════════════════════════════════ */
const WV_STRIP_START = 6;   // zichtbaar vanaf 06:00
const WV_STRIP_END   = 22;  // t/m 22:00
const WV_STRIP_HRS   = WV_STRIP_END - WV_STRIP_START; // 16 uur
const WV_STRIP_W     = 720; // px breed voor de tijdlijn

const wvStripX = time => {
  const [h, m] = time.split(":").map(Number);
  return ((h - WV_STRIP_START) + m / 60) * (WV_STRIP_W / WV_STRIP_HRS);
};
const wvStripW = dur => Math.max((dur / 60) * (WV_STRIP_W / WV_STRIP_HRS), 68);

function WeekDayStrips() {
  const clock   = useWVClock();
  const nowX    = wvStripX(WV_NOW);
  const STRIP_H = 108; // (480-46-4*1border) / 4

  return (
    <div data-screen-label="B — Dag-strips" className="scr" style={{
      background:"radial-gradient(120% 90% at 50% -8%,#16171c 0%,#08080a 55%)",
      display:"flex",flexDirection:"column"
    }}>
      <WVTopbar clock={clock} subtitle="WO 18 – ZA 21 JUNI"/>

      {/* Vier dag-strips */}
      {WV_SHOW.map((day, di) => {
        const isToday = day === WV_TODAY;
        const evs = WV_EVS.filter(e => e.day === day)
                          .sort((a,b) => a.time.localeCompare(b.time));
        const abbr = wvAbbr(day);

        return (
          <div key={day} style={{flex:1,display:"flex",alignItems:"stretch",
            borderBottom:di < 3?"1px solid rgba(255,255,255,.06)":"none",
            background:isToday?"rgba(255,255,255,.025)":"transparent"}}>

            {/* Dag-header links */}
            <div style={{width:72,flexShrink:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:3,
              borderRight:"1px solid rgba(255,255,255,.06)"}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1,
                color:isToday?"#fff":"rgba(255,255,255,.32)"}}>
                {abbr.toUpperCase()}
              </span>
              <div style={{width:32,height:32,borderRadius:9,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:isToday?"#5A96EB":"transparent",
                border:isToday?"none":"1px solid rgba(255,255,255,.09)"}}>
                <span style={{fontSize:14,fontWeight:isToday?800:600,
                  fontVariantNumeric:"tabular-nums",
                  color:isToday?"#fff":"rgba(255,255,255,.55)"}}>
                  {day}
                </span>
              </div>
            </div>

            {/* Tijdlijn */}
            <div style={{flex:1,position:"relative",overflow:"hidden"}}>
              {/* Subtiele uur-ticks */}
              {[8,10,12,14,16,18,20].map(h => (
                <div key={h} style={{position:"absolute",
                  left:wvStripX(`${h}:00`),top:0,bottom:0,
                  width:1,background:"rgba(255,255,255,.04)"}}/>
              ))}

              {/* NU-lijn (vandaag) */}
              {isToday && (
                <div style={{position:"absolute",left:nowX,top:6,bottom:6,
                  width:1.5,background:"#5A96EB",zIndex:3}}>
                  <div style={{position:"absolute",top:-3,left:-3,width:7,height:7,
                    borderRadius:"50%",background:"#5A96EB",
                    boxShadow:"0 0 6px rgba(90,150,235,.7)"}}/>
                </div>
              )}

              {/* Afspraken als horizontale blokken */}
              {evs.map((ev, i) => {
                const c  = wvFc(ev.who);
                const x  = ev.allDay ? 0 : wvStripX(ev.time);
                const w  = ev.allDay ? WV_STRIP_W : wvStripW(ev.dur);
                const past = !ev.allDay && ev.time <= WV_NOW && isToday;
                const topPos = isToday ? STRIP_H * 0.18 : STRIP_H * 0.22;
                return (
                  <div key={i} style={{position:"absolute",
                    left:x+4, top:topPos,
                    width:Math.min(w, WV_STRIP_W - x - 8),
                    height:STRIP_H * 0.55,
                    background:ev.allDay?`${c}14`:`${c}1c`,
                    borderLeft:`3px solid ${c}`,
                    borderRadius:"0 7px 7px 0",
                    padding:"5px 8px",overflow:"hidden",
                    opacity:past?0.4:1}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,
                      color:"rgba(255,255,255,.38)",marginBottom:2}}>
                      {ev.allDay ? "HELE DAG" : ev.time}
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:"#fff",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {ev.title}
                    </div>
                  </div>
                );
              })}

              {/* Tijdas-label uren onderaan */}
              {isToday && (
                <div style={{position:"absolute",bottom:4,left:0,right:0,
                  display:"flex",justifyContent:"space-between",padding:"0 0 0 0"}}>
                  {[8,10,12,14,16,18,20].map(h => (
                    <div key={h} style={{position:"absolute",
                      left:wvStripX(`${h}:00`)-8,bottom:0,
                      fontSize:8,fontWeight:600,color:"rgba(255,255,255,.2)",
                      letterSpacing:.3,fontVariantNumeric:"tabular-nums"}}>
                      {h}u
                    </div>
                  ))}
                </div>
              )}

              {evs.length === 0 && (
                <div style={{position:"absolute",inset:0,display:"flex",
                  alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:11,fontWeight:500,
                    color:"rgba(255,255,255,.18)",letterSpacing:.5}}>vrij</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   C — FOCUS + SIDEBAR  (vandaag groot · 3 dagen compact)
═══════════════════════════════════════════════════════ */
function WeekFocusSidebar() {
  const clock    = useWVClock();
  const todayEvs = WV_EVS.filter(e => e.day === WV_TODAY && !e.allDay)
                         .sort((a,b) => a.time.localeCompare(b.time));
  const futureDays = WV_SHOW.filter(d => d > WV_TODAY);

  return (
    <div data-screen-label="C — Focus + Sidebar" className="scr" style={{
      background:"radial-gradient(120% 90% at 50% -8%,#16171c 0%,#08080a 55%)",
      display:"flex",flexDirection:"column"
    }}>
      <WVTopbar clock={clock} subtitle="WO 18 – ZA 21 JUNI"/>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* Links: vandaag detail (420px) */}
        <div style={{width:420,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"14px 20px",borderRight:"1px solid rgba(255,255,255,.07)"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
            <span style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:-.5}}>Vandaag</span>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:2,
              color:"rgba(255,255,255,.30)"}}>WO 18 JUNI</span>
          </div>

          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,overflow:"hidden"}}>
            {todayEvs.map((ev, i) => {
              const c      = wvFc(ev.who);
              const past   = ev.time <= WV_NOW;
              const nextEv = todayEvs[i+1];
              const showNow = past && nextEv && nextEv.time > WV_NOW;
              return (
                <React.Fragment key={i}>
                  <div style={{display:"flex",alignItems:"center",gap:10,opacity:past?0.38:1}}>
                    <div style={{width:38,textAlign:"right",fontSize:11,fontWeight:700,
                      fontVariantNumeric:"tabular-nums",letterSpacing:.3,flexShrink:0,
                      color:"rgba(255,255,255,.35)"}}>{ev.time}</div>
                    <div style={{width:3,height:38,borderRadius:2,background:c,flexShrink:0}}/>
                    <div style={{flex:1,background:"#131418",
                      border:`1px solid ${c}20`,borderRadius:12,
                      padding:"9px 14px",display:"flex",alignItems:"center",
                      justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{ev.title}</span>
                      <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,flexShrink:0,
                        color:c,background:`${c}1a`,padding:"3px 9px",borderRadius:6}}>
                        {wvFl(ev.who)}
                      </span>
                    </div>
                  </div>
                  {showNow && (
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 0 0 50px"}}>
                      <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
                      <span style={{fontSize:9,fontWeight:800,letterSpacing:1.5,flexShrink:0,
                        color:"rgba(255,255,255,.30)"}}>NU · {WV_NOW}</span>
                      <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Rechts: 3 compacte dag-kaarten */}
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {futureDays.map((day, i) => {
            const evs  = WV_EVS.filter(e => e.day === day)
                               .sort((a,b) => a.time.localeCompare(b.time));
            const abbr = wvAbbr(day);
            return (
              <div key={day} style={{flex:1,display:"flex",flexDirection:"column",
                padding:"12px 20px",
                borderBottom:i < 2?"1px solid rgba(255,255,255,.07)":"none"}}>
                {/* Dag-kop */}
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
                  <div style={{width:28,height:28,borderRadius:8,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)"}}>
                    <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums",
                      color:"rgba(255,255,255,.75)"}}>{day}</span>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,
                    color:"rgba(255,255,255,.45)"}}>{abbr.toUpperCase()}</span>
                  {evs.length > 0 && (
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:1,marginLeft:"auto",
                      color:"rgba(255,255,255,.25)"}}>
                      {evs.length} AFSPRAKEN
                    </span>
                  )}
                </div>

                {/* Compacte events */}
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {evs.slice(0, 2).map((ev, j) => {
                    const c = wvFc(ev.who);
                    return (
                      <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,fontWeight:700,letterSpacing:.3,
                          fontVariantNumeric:"tabular-nums",flexShrink:0,
                          color:ev.allDay?"rgba(255,255,255,.28)":"rgba(255,255,255,.32)",
                          width:38,textAlign:"right"}}>
                          {ev.allDay ? "dag" : ev.time}
                        </span>
                        <div style={{width:2.5,height:20,borderRadius:2,background:c,flexShrink:0}}/>
                        <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.8)",
                          flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",
                          whiteSpace:"nowrap"}}>
                          {ev.title}
                        </span>
                        <span style={{fontSize:9,fontWeight:700,flexShrink:0,
                          color:c,background:`${c}18`,padding:"2px 7px",borderRadius:4}}>
                          {wvFl(ev.who)}
                        </span>
                      </div>
                    );
                  })}
                  {evs.length > 2 && (
                    <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.25)",
                      paddingLeft:46}}>
                      +{evs.length - 2} meer
                    </div>
                  )}
                  {evs.length === 0 && (
                    <div style={{fontSize:11,fontWeight:500,color:"rgba(255,255,255,.18)",
                      paddingLeft:46,fontStyle:"italic"}}>Geen afspraken</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WeekTimeGrid, WeekDayStrips, WeekFocusSidebar });
