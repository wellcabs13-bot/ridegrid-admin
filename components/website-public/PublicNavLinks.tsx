"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicNavLink } from "@/lib/website-public/types";
export default function PublicNavLinks({ links }: { links: PublicNavLink[] }) {
  const pathname = usePathname() || "/";
  const [hash,setHash] = useState("");
  useEffect(() => { const update = () => setHash(window.location.hash); update(); window.addEventListener("hashchange",update); return () => window.removeEventListener("hashchange",update); }, []);
  return <>{links.map(link => <Link key={`${link.location}-${link.href}-${link.label}`} href={link.href} prefetch={false} target={link.newTab ? "_blank" : undefined} rel={link.newTab ? "noopener noreferrer" : undefined} aria-current={link.href === `${pathname}${hash}` ? "page" : undefined} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); const href = link.href; if (href.startsWith("/#")) setHash(href.slice(1)); }}>{link.label}{link.newTab && <span className="sr-only"> (opens in a new tab)</span>}</Link>)}</>;
}
