import Link from "next/link";
import s from "./public.module.css";
export default function PublicState({ title, message, children }: { title: string; message: string; children?: React.ReactNode }) {
  return <div className={s.site}><main className={`${s.container} ${s.section}`}><p className={s.eyebrow}>RideGrid · Wellcabs</p><h1 className="mb-5 text-4xl font-black tracking-tight">{title}</h1><p className={s.sectionIntro}>{message}</p><div className={s.actions}>{children}<Link href="/" className={s.button}>Home</Link><Link href="/marketplace" className={s.button}>Find a ride ↗</Link></div></main></div>;
}
