// Guition 7" — Spotify schermen v3
// Player: split + bloom · Lyrics/Facts: persistente sidebar + content
const { useState, useEffect, useRef } = React;

const LYRICS = [
  { t:0,   x:"♪" },
  { t:12,  x:"Lichten over de snelweg, de stad ademt traag" },
  { t:22,  x:"We rijden door de nacht, geen reden om te stoppen" },
  { t:32,  x:"Jij draait het raampje open, de wind neemt het over" },
  { t:42,  x:"En alles wat we zochten ligt hier voor ons" },
  { t:53,  x:"Wakker, wakker — de morgen is van ons" },
  { t:63,  x:"Wakker, wakker — we laten het maar gaan" },
  { t:74,  x:"Neonlicht kleurt de hemel boven het asfalt" },
  { t:85,  x:"Een kort moment dat eindeloos lijkt te duren" },
  { t:96,  x:"Hou vast, hou vast, voor het straks weer verdwijnt" },
  { t:107, x:"Wakker, wakker — de morgen is van ons" },
  { t:118, x:"Wakker, wakker — we laten het maar gaan" },
  { t:130, x:"♪" },
];
const FACTS = [
  "M83 is genoemd naar Messier 83 — een spiraalstelsel op 15 miljoen lichtjaar afstand.",
  "Achter M83 zit de Franse muzikant Anthony Gonzalez. Begonnen als duo, nu soloproject.",
  "'Midnight City' verscheen in 2011 op het dubbelalbum Hurry Up, We're Dreaming.",
  "Het nummer eindigt met een saxofoonsolo — ongewoon voor een synthpop-hit.",
];

// ── gedeelde state hook ──────────────────────────
function useSpotify() {
  const sv = loadState();
  const [playing, setPlaying] = useState(sv.playing !== undefined ? sv.playing : true);
  const [pos,     setPos]     = useState(sv.pos  != null ? sv.pos  : 74);
  const [vol,     setVol]     = useState(sv.vol  != null ? sv.vol  : 0.62);
  const [shuffle, setShuffle] = useState(sv.shuffle !== undefined ? sv.shuffle : true);
  const [repeat,  setRepeat]  = useState(sv.repeat  || false);
  const [liked,   setLiked]   = useState(sv.liked   !== undefined ? sv.liked : true);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos(p => p >= TOTAL ? 0 : p + 1), 1000);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => { saveState({ playing, pos, vol, shuffle, repeat, liked }); },
    [playing, pos, vol, shuffle, repeat, liked]);
  return { playing, setPlaying, pos, setPos, vol, setVol,
           shuffle, setShuffle, repeat, setRepeat, liked, setLiked };
}

// ── sidebar links: art + minicontrols ───────────────
function SpotSidebar({ sp, showArt=true }) {
  const { playing, setPlaying, pos, setPos, vol, setVol,
          shuffle, setShuffle, repeat, setRepeat, liked, setLiked } = sp;
  const barRef = useRef(null);
  const volRef = useRef(null);
  const pct = pos / TOTAL * 100;
  const seek = e => { const r = barRef.current.getBoundingClientRect(); setPos(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*TOTAL); };
  const setV  = e => { const r = volRef.current.getBoundingClientRect(); setVol(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))); };

  return (
    <div style={{width:256,flexShrink:0,display:"flex",flexDirection:"column",
      padding:"20px 18px 18px 22px",borderRight:"1px solid rgba(255,255,255,.07)",
      background:"rgba(0,0,0,.28)"}}>

      {/* album art */}
      <div style={{width:212,height:212,borderRadius:14,flexShrink:0,
        background:"linear-gradient(145deg,#1c1d28,#0e0f18)",
        boxShadow:"0 16px 40px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.07)",
        display:"grid",placeItems:"center",position:"relative",overflow:"hidden"}}>
        {/* subtle color bloom in art placeholder */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 60% 40%,rgba(100,90,200,.18),transparent 65%)"}}/>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,
          color:"rgba(255,255,255,.35)",background:"rgba(0,0,0,.3)",padding:"2px 6px",borderRadius:4,position:"relative"}}>
          album art
        </span>
      </div>

      {/* song info */}
      <div style={{marginTop:14,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:14,fontWeight:800,letterSpacing:"-.3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>
            Midnight City
          </div>
          <button onClick={()=>setLiked(!liked)} style={{background:"none",border:"none",cursor:"pointer",padding:"0 0 0 6px",color:liked?"var(--green)":"rgba(255,255,255,.45)",flexShrink:0}}>
            <HeartIcon s={18} filled={liked}/>
          </button>
        </div>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.52)",marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          M83 · Hurry Up, We're Dreaming
        </div>
      </div>

      {/* progress */}
      <div style={{marginTop:12}}>
        <div ref={barRef} onClick={seek} style={{position:"relative",height:4,borderRadius:2,
          background:"rgba(255,255,255,.18)",cursor:"pointer"}}>
          <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2,background:"#fff",width:pct+"%"}}/>
          <div style={{position:"absolute",top:"50%",left:pct+"%",width:10,height:10,borderRadius:"50%",
            background:"#fff",transform:"translate(-50%,-50%)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:5,
          fontSize:10,fontWeight:500,color:"rgba(255,255,255,.45)",fontVariantNumeric:"tabular-nums"}}>
          <span>{fmt(pos)}</span><span>{fmt(TOTAL)}</span>
        </div>
      </div>

      {/* transport */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10}}>
        <button onClick={()=>setShuffle(!shuffle)} style={{...sBtn, color:shuffle?"var(--green)":"rgba(255,255,255,.45)"}}><ShuffleIcon s={15}/></button>
        <button onClick={()=>setPos(0)} style={sBtn}><PrevIcon s={18}/></button>
        <button onClick={()=>setPlaying(!playing)}
          style={{width:46,height:46,borderRadius:"50%",border:"none",background:"var(--green)",
            color:"#07140d",cursor:"pointer",display:"grid",placeItems:"center",
            boxShadow:"0 6px 20px color-mix(in oklch,var(--green) 40%,transparent)"}}>
          {playing ? <PauseIcon s={20}/> : <PlayIcon s={20}/>}
        </button>
        <button onClick={()=>setPos(0)} style={sBtn}><NextIcon s={18}/></button>
        <button onClick={()=>setRepeat(!repeat)} style={{...sBtn, color:repeat?"var(--green)":"rgba(255,255,255,.45)"}}><RepeatIcon s={15}/></button>
      </div>

      {/* volume */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
        <span style={{color:"rgba(255,255,255,.55)",display:"flex",flexShrink:0}}><VolIcon s={16}/></span>
        <div ref={volRef} onClick={setV} style={{flex:1,height:4,borderRadius:2,
          background:"rgba(255,255,255,.16)",position:"relative",cursor:"pointer"}}>
          <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2,
            background:"rgba(255,255,255,.8)",width:vol*100+"%"}}/>
        </div>
        <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.4)",
          width:22,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{Math.round(vol*100)}</span>
      </div>
    </div>
  );
}
const sBtn = {width:30,height:30,borderRadius:"50%",border:"none",background:"transparent",
  color:"rgba(255,255,255,.75)",cursor:"pointer",display:"grid",placeItems:"center"};

/* ══════════════════════════════════════════════════
   PLAYER  — split: bloom-art links · rijke controls rechts
══════════════════════════════════════════════════ */
function PlayerScreen() {
  const sp = useSpotify();
  const { playing, setPlaying, pos, setPos, vol, setVol,
          shuffle, setShuffle, repeat, setRepeat, liked, setLiked } = sp;
  const barRef = useRef(null);
  const volRef = useRef(null);
  const pct = pos / TOTAL * 100;
  const seek = e => { const r = barRef.current.getBoundingClientRect(); setPos(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*TOTAL); };
  const setV  = e => { const r = volRef.current.getBoundingClientRect(); setVol(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))); };

  return (
    <div className="scr" style={{display:"flex"}}>
      {/* left: album art + bloom */}
      <div style={{width:310,flexShrink:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"28px 20px",
        borderRight:"1px solid rgba(255,255,255,.07)",position:"relative",overflow:"hidden"}}>
        {/* bloom */}
        <div style={{position:"absolute",width:320,height:320,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(90,80,180,.28) 0%,transparent 68%)",
          filter:"blur(30px)",pointerEvents:"none"}}/>
        {/* art */}
        <div style={{width:256,height:256,borderRadius:16,position:"relative",
          background:"linear-gradient(145deg,#1c1d28,#0e0f18)",
          boxShadow:"0 20px 56px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.07)",
          display:"grid",placeItems:"center",overflow:"hidden",zIndex:1}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 60% 40%,rgba(100,90,200,.22),transparent 65%)"}}/>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
            color:"rgba(255,255,255,.35)",background:"rgba(0,0,0,.3)",padding:"3px 7px",
            borderRadius:4,position:"relative"}}>album art</span>
        </div>
        {/* playlist context */}
        <div style={{marginTop:16,textAlign:"center",zIndex:1}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,.3)"}}>VAN PLAYLIST</div>
          <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.55)",marginTop:3}}>Avond Chill · 42 nummers</div>
        </div>
      </div>

      {/* right: controls */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"22px 30px 18px 28px"}}>
        {/* context */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <span className="vc-pill" style={{background:"transparent",padding:0,fontSize:11,letterSpacing:1.5,color:"rgba(255,255,255,.38)",fontWeight:700}}>
            <Eq on={playing}/> &nbsp;NU SPEELT · WOONKAMER
          </span>
        </div>

        {/* title + like */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:46,fontWeight:800,letterSpacing:-2,lineHeight:1.0}}>Midnight City</div>
            <div style={{fontSize:15,fontWeight:600,color:"rgba(255,255,255,.6)",marginTop:6}}>M83 · Hurry Up, We're Dreaming · 2011</div>
          </div>
          <button onClick={()=>setLiked(!liked)} style={{background:"none",border:"none",cursor:"pointer",padding:4,
            color:liked?"var(--green)":"rgba(255,255,255,.5)",flexShrink:0,marginTop:6}}>
            <HeartIcon s={24} filled={liked}/>
          </button>
        </div>

        {/* genre chips */}
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
          {["Synth-pop","Electropop","Shoegaze","3:38"].map(t => (
            <span key={t} style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.55)",
              background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",
              padding:"4px 11px",borderRadius:999,letterSpacing:.2}}>{t}</span>
          ))}
        </div>

        {/* progress */}
        <div style={{marginTop:20}}>
          <div ref={barRef} onClick={seek} style={{position:"relative",height:5,borderRadius:2.5,
            background:"rgba(255,255,255,.2)",cursor:"pointer"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2.5,background:"#fff",width:pct+"%"}}/>
            <div style={{position:"absolute",top:"50%",left:pct+"%",width:14,height:14,borderRadius:"50%",
              background:"#fff",transform:"translate(-50%,-50%)",boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:11,
            fontWeight:500,color:"rgba(255,255,255,.48)",fontVariantNumeric:"tabular-nums"}}>
            <span>{fmt(pos)}</span><span>{fmt(TOTAL)}</span>
          </div>
        </div>

        {/* transport */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setShuffle(!shuffle)} style={{...pBtn,color:shuffle?"var(--green)":"rgba(255,255,255,.5)"}}><ShuffleIcon s={18}/></button>
            <button onClick={()=>setPos(0)} style={pBtn}><PrevIcon s={22}/></button>
            <button onClick={()=>setPlaying(!playing)}
              style={{width:62,height:62,borderRadius:"50%",border:"none",background:"var(--green)",
                color:"#07140d",cursor:"pointer",display:"grid",placeItems:"center",flexShrink:0,
                boxShadow:"0 10px 28px color-mix(in oklch,var(--green) 42%,transparent)"}}>
              {playing ? <PauseIcon s={26}/> : <PlayIcon s={26}/>}
            </button>
            <button onClick={()=>setPos(0)} style={pBtn}><NextIcon s={22}/></button>
            <button onClick={()=>setRepeat(!repeat)} style={{...pBtn,color:repeat?"var(--green)":"rgba(255,255,255,.5)"}}><RepeatIcon s={18}/></button>
          </div>
          {/* volume */}
          <div style={{display:"flex",alignItems:"center",gap:10,width:190}}>
            <span style={{color:"rgba(255,255,255,.65)",flexShrink:0,display:"flex"}}><VolIcon s={18}/></span>
            <div ref={volRef} onClick={setV} style={{flex:1,height:5,borderRadius:2.5,
              background:"rgba(255,255,255,.18)",position:"relative",cursor:"pointer"}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2.5,
                background:"rgba(255,255,255,.85)",width:vol*100+"%"}}/>
              <div style={{position:"absolute",top:"50%",left:vol*100+"%",width:13,height:13,
                borderRadius:"50%",background:"#fff",transform:"translate(-50%,-50%)"}}/>
            </div>
            <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.42)",
              width:24,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{Math.round(vol*100)}</span>
          </div>
        </div>

        {/* volgende track */}
        <div style={{marginTop:16,padding:"10px 14px",background:"rgba(255,255,255,.05)",
          borderRadius:12,border:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,.32)",flexShrink:0}}>VOLGENDE</div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.1)",flexShrink:0}}/>
          <div style={{width:32,height:32,borderRadius:6,background:"linear-gradient(135deg,#1c1d28,#0e0f18)",
            flexShrink:0,border:"1px solid rgba(255,255,255,.06)"}}/>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Wait</div>
            <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.45)"}}>M83</div>
          </div>
          <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.3)",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>4:22</span>
        </div>
      </div>
    </div>
  );
}
const pBtn = {width:38,height:38,borderRadius:"50%",border:"none",background:"rgba(255,255,255,.08)",
  color:"#fff",cursor:"pointer",display:"grid",placeItems:"center",flexShrink:0};

/* ══════════════════════════════════════════════════
   SONGTEKST — sidebar links · lyrics rechts
══════════════════════════════════════════════════ */
const LYR_SLOT = 62;

function LyricsScreen() {
  const sp = useSpotify();
  let active = 0;
  const WIN_H = 480;
  for (let i = 0; i < LYRICS.length; i++) if (sp.pos >= LYRICS[i].t) active = i;
  const offset = WIN_H / 2 - (active + 0.5) * LYR_SLOT;

  return (
    <div className="scr" style={{display:"flex"}}>
      <SpotSidebar sp={sp}/>
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>
        {/* fade top/bottom */}
        <div style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none",
          background:"linear-gradient(180deg,rgba(8,8,12,.92) 0%,transparent 16%,transparent 72%,rgba(8,8,12,.95) 100%)"}}/>
        {/* label */}
        <div style={{position:"absolute",top:20,right:20,zIndex:4}}>
          <span className="vc-pill" style={{fontSize:11}}><Eq on={sp.playing}/> songtekst</span>
        </div>
        {/* lyrics */}
        <div style={{position:"absolute",inset:0,overflow:"hidden",zIndex:3}}>
          <div style={{position:"absolute",left:0,right:0,top:0,
            transition:"transform .55s cubic-bezier(.22,.61,.36,1)",
            transform:`translateY(${offset}px)`}}>
            {LYRICS.map((l,i) => (
              <div key={i} style={{
                height:LYR_SLOT,display:"flex",alignItems:"center",padding:"0 36px",
                fontSize:24,fontWeight:700,letterSpacing:"-.3px",lineHeight:1.2,
                color: i===active?"#fff" : i<active?"rgba(255,255,255,.2)":"rgba(255,255,255,.3)",
                transform: i===active?"scale(1.05)":"none",
                transformOrigin:"left center",transition:"color .4s,transform .4s",
              }}>{l.x}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   WIST JE DAT — sidebar links · facts rechts
══════════════════════════════════════════════════ */
function FactsScreen() {
  const sp = useSpotify();
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFi(n => (n+1) % FACTS.length), 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="scr" style={{display:"flex"}}>
      <SpotSidebar sp={sp}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"22px 28px 20px 24px",position:"relative",overflow:"hidden"}}>
        {/* bg glow */}
        <div style={{position:"absolute",top:"30%",right:"20%",width:220,height:220,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(80,70,180,.14),transparent 70%)",
          filter:"blur(24px)",pointerEvents:"none"}}/>

        {/* artiest header */}
        <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <div style={{width:56,height:56,borderRadius:"50%",flexShrink:0,
            backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 9px),linear-gradient(150deg,#3a3c66,#1a1b2e)",
            boxShadow:"inset 0 0 0 1px rgba(255,255,255,.14)",display:"grid",placeItems:"center",overflow:"hidden"}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,color:"rgba(255,255,255,.4)"}}>foto</span>
          </div>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>M83</div>
            <div style={{fontSize:11,fontWeight:600,color:"var(--muted)",marginTop:2}}>Synth-pop · Antibes, FR · 2001</div>
          </div>
          {/* stats */}
          <div style={{marginLeft:"auto",display:"flex",gap:16}}>
            {[["12.4M","LUISTERAARS"],["847","NUMMERS"],["#3","TREND NL"]].map(([v,l]) => (
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,letterSpacing:"-.5px",fontVariantNumeric:"tabular-nums"}}>{v}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:"var(--muted)",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{height:1,background:"rgba(255,255,255,.07)",margin:"18px 0",flexShrink:0}}/>

        {/* eyebrow */}
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,fontWeight:700,
          letterSpacing:"2.5px",color:"var(--green)",marginBottom:14,flexShrink:0}}>
          <InfoIcon s={13}/> WIST JE DAT?
        </div>

        {/* fact text */}
        <div key={fi} style={{flex:1,display:"flex",alignItems:"center",
          fontSize:22,fontWeight:700,lineHeight:1.45,letterSpacing:"-.3px",
          animation:"factIn .45s cubic-bezier(.22,.61,.36,1) both"}}>
          {FACTS[fi]}
        </div>

        {/* bottom: album strip + dots */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,marginTop:12}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {FACTS.map((_,n) => (
              <span key={n} onClick={()=>setFi(n)} style={{
                width: n===fi?20:7, height:7, borderRadius: n===fi?4:3.5,
                background: n===fi?"var(--green)":"rgba(255,255,255,.22)",
                cursor:"pointer",transition:"width .3s,background .3s",display:"inline-block"
              }}/>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            {["Hurry Up…","Saturdays=Youth","Dead Cities…"].map(album => (
              <div key={album} style={{textAlign:"center"}}>
                <div style={{width:44,height:44,borderRadius:8,
                  background:"linear-gradient(135deg,#1c1d28,#0e0f18)",
                  border:"1px solid rgba(255,255,255,.07)"}}/>
                <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,.35)",marginTop:4,
                  width:44,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{album}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlayerScreen, LyricsScreen, FactsScreen });
