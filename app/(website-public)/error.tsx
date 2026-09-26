"use client";
import PublicState from "@/components/website-public/PublicState";
export default function ErrorPage({ reset }: { reset: () => void }) { return <PublicState title="A brief stop along the way." message="We couldn’t load this page. Please try again, or continue to the marketplace."><button className="rounded-lg bg-zinc-900 px-6 py-4 font-bold text-white" onClick={reset}>Try again</button></PublicState>; }
