// g7-calendar.jsx — Familie Agenda · drie kleurvarianten voor Guition 7″ 800×480
const { useState: useCalSt, useEffect: useCalEf } = React;

/* ── klok ──────────────────────────────────────────── */
function useAgendaClock() {
  const [t, setT] = useCalSt(() => new Date());
  useCalEf(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return t.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

/* ── data ──────────────────────────────────────────── */
const CAL_FAM = [
  { id:"papa",  label:"Papa",  color:"#5A96EB" },
  { id:"mama",  label:"Mama",  color:"#F5B45A" },
  { id:"emma",  label:"Emma",  color:"#9678EB" },
  { id:"lotte", label:"Lotte", color:"#4ADE80" },
];

const CAL_EVS = [
  { day:15, time:"09:00", title:"Taekwondo",       who:"emma"  },
  { day:16, time:"10:00", title:"Werk thuis",       who:"papa"  },
  { day:17, time:"16:30", title:"Muziekles",        who:"lotte" },
  { day:18, time:"07:30", title:"Standup",          who:"papa"  },
  { day:18, time:"09:00", title:"Yoga",             who:"mama"  },
  { day:18, time:"14:30", title:"Tandarts",         who:"lotte" },
  { day:18, time:"16:00", title:"Zwemles",          who:"emma"  },
  { day:18, time:"18:30", title:"Eten bij opa",     who:"all"   },
  { day:19, time:"08:00", title:"Schoolfeest",      who:"emma"  },
  { day:19, time:"19:00", title:"Buurtvergadering", who:"papa"  },
  { day:20, time:"14:00", title:"Voetbal",          who:"lotte" },
  { day:21, time:"11:00", title:"Doktersafspraak",  who:"papa"  },
];

const CAL_WABBR   = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const CAL_WDATES  = [15,16,17,18,19,20,21];
const CAL_TODAY   = 18;
const CAL_NOW     = "12:45";

const calFc     = who => (CAL_FAM.find(m => m.id === who) || { color:"#96AAC3" }).color;
const calFl     = who => (CAL_FAM.find(m => m.id === who) || { label:"Familie" }).label;
const calDots   = day => CAL_EVS.filter(e => e.day === day).map(e => calFc(e.who));
const calToday  = CAL_EVS.filter(e => e.day === CAL_TODAY).sort((a,b) => a.time.localeCompare(b.time));
const calFuture = CAL_EVS.filter(e => e.day > CAL_TODAY).sort((a,b) => a.day - b.day || a.time.localeCompare(b.time));

/* ── gedeeld: eventlijst renderer ─────────────────── */
function EventList({ evs, timeColor, cardBg, cardBorder, cardShadow, titleColor, nowLineColor, nowTextColor }) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,overflow:"hidden"}}>
      {evs.map((ev, i) => {
        const c      = calFc(ev.who);
        const past   = ev.time <= CAL_NOW;
        const nextEv = evs[i + 1];
        const showNow = past && nextEv && nextEv.time > CAL_NOW;
        return (
          <React.Fragment key={i}>
            <div style={{display:"flex",alignItems:"center",gap:10,opacity:past ? 0.38 : 1,transition:"opacity .2s"}}>
              <div style={{width:38,textAlign:"right",fontSize:11,fontWeight:700,
                fontVariantNumeric:"tabular-nums",letterSpacing:.3,flexShrink:0,color:timeColor}}>
                {ev.time}
              </div>
              <div style={{width:3,height:38,borderRadius:2,background:c,flexShrink:0}}/>
              <div style={{flex:1,background:cardBg,border:cardBorder ? `1px solid ${cardBorder}` : "none",
                boxShadow:cardShadow||"none",borderRadius:12,padding:"9px 14px",
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:700,color:titleColor}}>{ev.title}</span>
                <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,flexShrink:0,
                  color:c,background:`${c}1a`,padding:"3px 9px",borderRadius:6}}>
                  {calFl(ev.who)}
                </span>
              </div>
            </div>
            {showNow && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 0 0 50px"}}>
                <div style={{flex:1,height:1,background:nowLineColor}}/>
                <span style={{fontSize:9,fontWeight:800,letterSpacing:1.5,color:nowTextColor,flexShrink:0}}>
                  NU · {CAL_NOW}
                </span>
                <div style={{flex:1,height:1,background:nowLineColor}}/>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── gedeeld: weekstrip ────────────────────────────── */
function WeekStrip({ abbrColor, numColor, numColorActive, circleBg, circleBorder }) {
  return (
    <div style={{display:"flex",gap:2,marginBottom:14}}>
      {CAL_WDATES.map((d, i) => {
        const active = d === CAL_TODAY;
        const ds = calDots(d);
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:.8,
              color:active ? abbrColor[1] : abbrColor[0]}}>
              {CAL_WABBR[i]}
            </span>
            <div style={{width:30,height:30,borderRadius:9,display:"flex",alignItems:"center",
              justifyContent:"center",
              background:active ? "#5A96EB" : circleBg,
              border:active ? "none" : `1px solid ${circleBorder}`}}>
              <span style={{fontSize:13,fontWeight:active?800:600,fontVariantNumeric:"tabular-nums",
                color:active ? "#fff" : numColor}}>
                {d}
              </span>
            </div>
            <div style={{display:"flex",gap:2,height:5}}>
              {ds.slice(0,3).map((c,j) => (
                <div key={j} style={{width:4,height:4,borderRadius:"50%",background:c,opacity:.9}}/>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── gedeeld: komende dagen ────────────────────────── */
function FutureList({ metaColor, titleColor }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,overflow:"hidden"}}>
      {calFuture.slice(0, 4).map((ev, i) => {
        const c    = calFc(ev.who);
        const abbr = CAL_WABBR[CAL_WDATES.indexOf(ev.day)];
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:34,borderRadius:2,background:c,flexShrink:0}}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:metaColor,marginBottom:2}}>
                {abbr} {ev.day} · {ev.time}
              </div>
              <div style={{fontSize:12,fontWeight:700,color:titleColor,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {ev.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── gedeeld: familiegenda ─────────────────────────── */
function FamLegend({ color }) {
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:"5px 14px"}}>
      {CAL_FAM.map(m => (
        <div key={m.id} style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:m.color}}/>
          <span style={{fontSize:11,fontWeight:600,color}}>{m.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   A — DONKER  (klassiek control-room thema)
══════════════════════════════════════════════ */
function CalendarDark() {
  const clock = useAgendaClock();
  return (
    <div data-screen-label="A — Donker" className="scr" style={{
      background:"radial-gradient(120% 90% at 50% -8%,#16171c 0%,#08080a 55%)",
      display:"flex",flexDirection:"column"
    }}>
      {/* Topbar */}
      <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 24px",borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:9}}>
          <span style={{fontSize:13,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,.85)"}}>FAMILIE AGENDA</span>
          <span style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:"rgba(255,255,255,.28)"}}>JUNI 2026</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums",
            color:"rgba(255,255,255,.5)"}}>{clock}</span>
          <span style={{width:7,height:7,borderRadius:"50%",background:"oklch(0.74 0.13 150)",
            boxShadow:"0 0 7px oklch(0.74 0.13 150 / .8)",display:"inline-block"}}/>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Links */}
        <div style={{width:262,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"14px 14px 14px 24px",borderRight:"1px solid rgba(255,255,255,.07)"}}>
          <WeekStrip
            abbrColor={["rgba(255,255,255,.28)","#fff"]}
            numColor="rgba(255,255,255,.5)"
            circleBg="transparent"
            circleBorder="rgba(255,255,255,.09)"
          />
          <div style={{height:1,background:"rgba(255,255,255,.07)",marginBottom:12}}/>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,
            color:"rgba(255,255,255,.28)",marginBottom:10}}>KOMENDE DAGEN</div>
          <FutureList metaColor="rgba(255,255,255,.32)" titleColor="rgba(255,255,255,.75)"/>
          <div style={{paddingTop:10,borderTop:"1px solid rgba(255,255,255,.07)"}}>
            <FamLegend color="rgba(255,255,255,.42)"/>
          </div>
        </div>

        {/* Rechts */}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 22px 14px 20px"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
            <span style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:-.5}}>Vandaag</span>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,.32)"}}>WO 18 JUNI</span>
          </div>
          <EventList
            evs={calToday}
            timeColor="rgba(255,255,255,.35)"
            cardBg="#131418"
            cardBorder="rgba(255,255,255,.07)"
            titleColor="#fff"
            nowLineColor="rgba(255,255,255,.12)"
            nowTextColor="rgba(255,255,255,.32)"
          />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   B — LICHT  (warm papier thema)
══════════════════════════════════════════════ */
function CalendarLight() {
  const clock = useAgendaClock();
  return (
    <div data-screen-label="B — Licht" className="scr" style={{
      background:"#f0ede5",display:"flex",flexDirection:"column"
    }}>
      {/* Topbar */}
      <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 24px",borderBottom:"1px solid rgba(0,0,0,.09)",flexShrink:0,background:"#e8e4db"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:9}}>
          <span style={{fontSize:13,fontWeight:700,letterSpacing:3,color:"rgba(0,0,0,.72)"}}>FAMILIE AGENDA</span>
          <span style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:"rgba(0,0,0,.28)"}}>JUNI 2026</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums",
            color:"rgba(0,0,0,.38)"}}>{clock}</span>
          <span style={{width:7,height:7,borderRadius:"50%",background:"oklch(0.74 0.13 150)",
            boxShadow:"0 0 7px oklch(0.74 0.13 150 / .8)",display:"inline-block"}}/>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Links */}
        <div style={{width:262,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"14px 14px 14px 24px",borderRight:"1px solid rgba(0,0,0,.08)",background:"#e8e4db"}}>
          <WeekStrip
            abbrColor={["rgba(0,0,0,.28)","rgba(0,0,0,.82)"]}
            numColor="rgba(0,0,0,.52)"
            circleBg="transparent"
            circleBorder="rgba(0,0,0,.1)"
          />
          <div style={{height:1,background:"rgba(0,0,0,.08)",marginBottom:12}}/>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,
            color:"rgba(0,0,0,.28)",marginBottom:10}}>KOMENDE DAGEN</div>
          <FutureList metaColor="rgba(0,0,0,.32)" titleColor="rgba(0,0,0,.72)"/>
          <div style={{paddingTop:10,borderTop:"1px solid rgba(0,0,0,.08)"}}>
            <FamLegend color="rgba(0,0,0,.42)"/>
          </div>
        </div>

        {/* Rechts */}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 22px 14px 20px"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
            <span style={{fontSize:20,fontWeight:800,color:"#111",letterSpacing:-.5}}>Vandaag</span>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"rgba(0,0,0,.30)"}}>WO 18 JUNI</span>
          </div>
          <EventList
            evs={calToday}
            timeColor="rgba(0,0,0,.32)"
            cardBg="#fff"
            cardShadow="0 1px 5px rgba(0,0,0,.07)"
            titleColor="#111"
            nowLineColor="rgba(0,0,0,.1)"
            nowTextColor="rgba(0,0,0,.28)"
          />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   C — GESPLITST  (donker kalender · papier agenda)
══════════════════════════════════════════════ */
function CalendarSplit() {
  const clock = useAgendaClock();
  return (
    <div data-screen-label="C — Gesplitst" className="scr" style={{display:"flex",flexDirection:"column"}}>
      {/* Topbar — gesplitst in kleur */}
      <div style={{height:46,display:"flex",flexShrink:0}}>
        <div style={{width:262,flexShrink:0,display:"flex",alignItems:"center",
          padding:"0 14px 0 24px",background:"#0a0b0f",
          borderBottom:"1px solid rgba(255,255,255,.07)",borderRight:"1px solid rgba(255,255,255,.07)"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:9}}>
            <span style={{fontSize:13,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,.85)"}}>AGENDA</span>
            <span style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:"rgba(255,255,255,.28)"}}>JUNI 2026</span>
          </div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",
          padding:"0 24px",background:"#f0ede5",borderBottom:"1px solid rgba(0,0,0,.09)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums",
              color:"rgba(0,0,0,.38)"}}>{clock}</span>
            <span style={{width:7,height:7,borderRadius:"50%",background:"oklch(0.74 0.13 150)",
              boxShadow:"0 0 7px oklch(0.74 0.13 150 / .8)",display:"inline-block"}}/>
          </div>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Links — donker */}
        <div style={{width:262,flexShrink:0,display:"flex",flexDirection:"column",
          padding:"14px 14px 14px 24px",background:"#0a0b0f",
          borderRight:"1px solid rgba(255,255,255,.09)"}}>
          <WeekStrip
            abbrColor={["rgba(255,255,255,.26)","#fff"]}
            numColor="rgba(255,255,255,.48)"
            circleBg="transparent"
            circleBorder="rgba(255,255,255,.09)"
          />
          <div style={{height:1,background:"rgba(255,255,255,.07)",marginBottom:12}}/>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,
            color:"rgba(255,255,255,.26)",marginBottom:10}}>KOMENDE DAGEN</div>
          <FutureList metaColor="rgba(255,255,255,.30)" titleColor="rgba(255,255,255,.72)"/>
          <div style={{paddingTop:10,borderTop:"1px solid rgba(255,255,255,.07)"}}>
            <FamLegend color="rgba(255,255,255,.40)"/>
          </div>
        </div>

        {/* Rechts — licht */}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 22px 14px 20px",
          background:"#f0ede5"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
            <span style={{fontSize:20,fontWeight:800,color:"#111",letterSpacing:-.5}}>Vandaag</span>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"rgba(0,0,0,.30)"}}>WO 18 JUNI</span>
          </div>
          <EventList
            evs={calToday}
            timeColor="rgba(0,0,0,.32)"
            cardBg="#fff"
            cardShadow="0 1px 6px rgba(0,0,0,.08)"
            titleColor="#111"
            nowLineColor="rgba(0,0,0,.1)"
            nowTextColor="rgba(0,0,0,.28)"
          />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalendarDark, CalendarLight, CalendarSplit });
