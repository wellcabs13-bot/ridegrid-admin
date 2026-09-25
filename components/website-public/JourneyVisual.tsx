import { ArrowUpRight, Check, MapPin, Route } from "lucide-react";
import s from "./Premium.module.css";

export default function JourneyVisual() {
  return <div className={s.journeyVisual} aria-label="An illustration of a journey from pickup to destination">
    <div className={s.journeyTop}><span><span className={s.liveDot}/> THE WAY FORWARD</span><ArrowUpRight size={20}/></div>
    <svg viewBox="0 0 520 360" className={s.journeyMap} role="img" aria-label="Illustrated route between two map markers">
      <defs><linearGradient id="wellcabs-route" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#ff7759"/><stop offset="1" stopColor="#ffd9a3"/></linearGradient></defs>
      <g fill="none" stroke="#d3e2ea" strokeOpacity=".12" strokeWidth="1.2"><path d="M0 60L520 290M0 120L520 350M0 190L385 360M110 0L520 185M260 0L0 330M375 0L90 360M490 0L205 360"/><path d="M50 0L500 360M0 255L205 0"/></g>
      <path d="M105 278 C90 185 300 300 275 185 S440 170 410 65" stroke="#ff7759" strokeOpacity=".1" strokeWidth="32" fill="none"/>
      <path d="M105 278 C90 185 300 300 275 185 S440 170 410 65" stroke="url(#wellcabs-route)" strokeWidth="4" fill="none" className={s.routeLine}/>
      <circle cx="105" cy="278" r="18" fill="#ff7759" fillOpacity=".15"/><circle cx="105" cy="278" r="7" fill="#ff7759"/>
      <circle cx="410" cy="65" r="18" fill="#ffddb0" fillOpacity=".15"/><circle cx="410" cy="65" r="7" fill="#ffddb0"/>
      <text x="76" y="321" fill="#d4e4ec" fontSize="12" letterSpacing="2">PICKUP</text><text x="303" y="37" fill="#d4e4ec" fontSize="12" letterSpacing="2">YOUR NEXT STOP</text>
    </svg>
    <div className={s.journeyCard}><span className={s.miniIcon}><Route size={21}/></span><div><strong>A little less planning.</strong><p>A lot more going places.</p></div><Check size={19}/></div>
    <div className={s.journeyTag}><MapPin size={14}/> Your journey. Your choice.</div>
  </div>;
}
