// Guition 7" — gedeelde iconen + mini transport strip
const ic = { fill:"none", stroke:"currentColor", strokeWidth:2, strokeLinecap:"round", strokeLinejoin:"round" };
const PlayIcon  = ({s=26}) => <svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 4.5 19 12 7 19.5Z" fill="currentColor"/></svg>;
const PauseIcon = ({s=26}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.3"/><rect x="14" y="5" width="4" height="14" rx="1.3"/></svg>;
const NextIcon  = ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5 5 15 12 5 19Z"/><rect x="16" y="5" width="3" height="14" rx="1.2"/></svg>;
const PrevIcon  = ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 5 9 12 19 19Z"/><rect x="5" y="5" width="3" height="14" rx="1.2"/></svg>;
const ShuffleIcon = ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M3 6h4l10 12h4"/><path d="M3 18h4l3.5-4.2"/><path d="M14.5 8.2 17 6h4"/><path d="M18.5 3.5 21 6l-2.5 2.5"/><path d="M18.5 15.5 21 18l-2.5 2.5"/></svg>;
const RepeatIcon  = ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M6 7h10a3 3 0 013 3v1"/><path d="M18 4.5 20.5 7 18 9.5"/><path d="M18 17H8a3 3 0 01-3-3v-1"/><path d="M6 19.5 3.5 17 6 14.5"/></svg>;
const VolIcon    = ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic}><path d="M4 9h3l4-3.5v13L7 15H4Z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 010 6"/><path d="M18 6.5a7.5 7.5 0 010 11"/></svg>;
const DeviceIcon = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic}><rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="15" r="3.2"/><circle cx="12" cy="7" r="1" fill="currentColor"/></svg>;
const HeartIcon  = ({s=22,filled=false}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic} fill={filled?"currentColor":"none"}><path d="M12 20C12 20 4 14.5 4 8.8A4.2 4.2 0 0112 6.4 4.2 4.2 0 0120 8.8C20 14.5 12 20 12 20Z"/></svg>;
const InfoIcon   = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r=".5" fill="currentColor" stroke="none"/></svg>;
const SunIcon    = ({s=22,color="#F5B45A"}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const CloudIcon  = ({s=22,color="#96AAC3"}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round"><path d="M17.5 19H9a5 5 0 010-10 5.5 5.5 0 0110.9 2.4A3.5 3.5 0 0117.5 19Z"/></svg>;
const RainIcon   = ({s=22,color="#5A96EB"}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round"><path d="M17.5 17H9a5 5 0 010-10 5.5 5.5 0 0110.9 2.4A3.5 3.5 0 0117.5 17Z"/><path d="M10 20v2M14 20v2M8 20v2"/></svg>;
const BulbIcon   = ({s=22,on=false}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={on?"#F5B45A":"rgba(255,255,255,.4)"} fill="none" strokeWidth={1.8} strokeLinecap="round"><path d="M9 21h6M12 3a6 6 0 016 6c0 2.4-1.4 4.5-3.5 5.5V17H9.5v-2.5C7.4 13.5 6 11.4 6 9a6 6 0 016-6z" fill={on?"rgba(245,180,90,.18)":"none"}/></svg>;
const SceneIcon  = ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" {...ic}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>;

const Eq = ({on}) => (
  <span className="eq" data-on={String(on)}>
    <i/><i/><i/><i/>
  </span>
);

// ── Shared state persistence ─────────────────────
const LS_KEY = "g7_spotify";
const loadState = () => { try { return JSON.parse(localStorage.getItem(LS_KEY))||{}; } catch { return {}; } };
const saveState = (s) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };
const TOTAL = 218;
const fmt = (s) => Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");

// ── Mini transport strip (bottom of lyrics/facts) ─
function MiniTransport({ playing, setPlaying, pos, setPos, vol, setVol, shuffle, setShuffle, repeat, setRepeat }) {
  const barRef = React.useRef(null);
  const volRef = React.useRef(null);
  const pct = pos / TOTAL * 100;
  const seek = e => { const r = barRef.current.getBoundingClientRect(); setPos(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*TOTAL); };
  const setV  = e => { const r = volRef.current.getBoundingClientRect(); setVol(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))); };
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:70,zIndex:10,
      background:"rgba(0,0,0,.72)",backdropFilter:"blur(16px)",
      borderTop:"1px solid rgba(255,255,255,.1)",
      padding:"8px 24px 10px",display:"flex",flexDirection:"column",gap:6}}>
      {/* progress */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.5)",fontVariantNumeric:"tabular-nums",width:26,flexShrink:0}}>{fmt(pos)}</span>
        <div ref={barRef} onClick={seek} style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,.2)",position:"relative",cursor:"pointer"}}>
          <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2,background:"#fff",width:pct+"%"}}/>
          <div style={{position:"absolute",top:"50%",left:pct+"%",width:10,height:10,borderRadius:"50%",background:"#fff",transform:"translate(-50%,-50%)"}}/>
        </div>
        <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.5)",fontVariantNumeric:"tabular-nums",width:26,flexShrink:0,textAlign:"right"}}>{fmt(TOTAL)}</span>
      </div>
      {/* controls row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        {/* song info */}
        <div style={{width:180,minWidth:0,overflow:"hidden"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Midnight City</div>
          <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.55)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>M83</div>
        </div>
        {/* prev/play/next */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setShuffle(!shuffle)} style={{...miniBtn, color:shuffle?"var(--green)":"rgba(255,255,255,.5)"}}><ShuffleIcon s={14}/></button>
          <button onClick={()=>setPos(0)} style={miniBtn}><PrevIcon s={18}/></button>
          <button onClick={()=>setPlaying(!playing)} style={{...miniBtn,width:38,height:38,background:"var(--green)",color:"#07140d",borderRadius:"50%"}}>
            {playing ? <PauseIcon s={18}/> : <PlayIcon s={18}/>}
          </button>
          <button onClick={()=>setPos(0)} style={miniBtn}><NextIcon s={18}/></button>
          <button onClick={()=>setRepeat(!repeat)} style={{...miniBtn, color:repeat?"var(--green)":"rgba(255,255,255,.5)"}}><RepeatIcon s={14}/></button>
        </div>
        {/* volume */}
        <div style={{display:"flex",alignItems:"center",gap:8,width:160}}>
          <span style={{color:"rgba(255,255,255,.6)",display:"flex",flexShrink:0}}><VolIcon s={16}/></span>
          <div ref={volRef} onClick={setV} style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,.2)",position:"relative",cursor:"pointer"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:2,background:"rgba(255,255,255,.8)",width:vol*100+"%"}}/>
          </div>
          <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.45)",width:22,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{Math.round(vol*100)}</span>
        </div>
      </div>
    </div>
  );
}

const miniBtn = {
  width:32,height:32,borderRadius:"50%",border:"none",
  background:"rgba(255,255,255,.08)",color:"#fff",
  cursor:"pointer",display:"grid",placeItems:"center",
  flexShrink:0
};

Object.assign(window, {
  PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon,
  VolIcon, DeviceIcon, HeartIcon, InfoIcon, Eq,
  SunIcon, CloudIcon, RainIcon, BulbIcon, SceneIcon,
  MiniTransport, miniBtn,
  loadState, saveState, TOTAL, fmt, ic
});
