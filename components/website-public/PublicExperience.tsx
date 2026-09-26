"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { WELLCABS } from "@/lib/website-public/brand";
import s from "./PublicShell.module.css";

/** Progressive enhancement: content stays visible without JS or with reduced motion. */
export default function PublicExperience() {
  const marker = useRef<HTMLSpanElement>(null);
  const pathname = usePathname() || "/";
  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const reset = () => root.querySelectorAll("[data-reveal-state]").forEach(el => el.removeAttribute("data-reveal-state"));
    const setup = () => {
      observer?.disconnect(); reset();
      if (media.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.setAttribute("data-reveal-state", "visible"); observer?.unobserve(entry.target); }
      }), { threshold: 0.06 });
      root.querySelectorAll("main > section, main > article, [data-reveal]").forEach(el => {
        if (el.getBoundingClientRect().top > window.innerHeight) { el.setAttribute("data-reveal-state", "pending"); observer?.observe(el); }
      });
    };
    setup(); media.addEventListener("change",setup);
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      root.querySelectorAll<HTMLDetailsElement>("header details[open]").forEach(el => { el.open=false; el.querySelector<HTMLElement>("summary")?.focus(); });
    };
    document.addEventListener("keydown",closeMenu);
    const selectMenuLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("header details a");
      link?.closest("details")?.removeAttribute("open");
    };
    root.addEventListener("click", selectMenuLink);
    return () => { observer?.disconnect(); reset(); media.removeEventListener("change",setup); document.removeEventListener("keydown",closeMenu); root.removeEventListener("click",selectMenuLink); };
  },[pathname]);
  return <><span ref={marker} hidden />{!pathname.startsWith("/marketplace") && <a href={WELLCABS.whatsapp} target="_blank" rel="noopener noreferrer" className={s.whatsappFloat} aria-label="Chat with Wellcabs on WhatsApp (opens in a new tab)"><MessageCircle size={24} aria-hidden="true"/><span>Let’s plan your ride</span></a>}</>;
}
