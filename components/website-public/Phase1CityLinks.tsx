import Link from "next/link";
import { phase1Pages } from "@/lib/website-public/phase1";
/** Server-only discovery keeps all Phase-1 pages within two hops of the homepage. */
export default function Phase1CityLinks() {
  return <nav aria-label="Travel city hubs" className="mx-auto max-w-7xl px-6 py-10"><h2 className="mb-4 text-xl font-bold">Plan travel from your city</h2><ul className="flex flex-wrap gap-3">{phase1Pages.filter(page => page.pageType === "city").map(page => <li key={page.pageId}><Link className="inline-flex min-h-11 items-center rounded-lg border border-current px-4 py-2" href={page.canonicalUrl}>{page.city}</Link></li>)}</ul></nav>;
}
