"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Same central authentication, but only Corporate Admin accounts may continue here.
// Any other role is signed out again and gets no link to another workspace.
export default function CorporateLoginForm() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(""); setBusy(true);
    try {
      const user = await login(form.email, form.password);
      if (user?.role !== "CORPORATE_ADMIN") {
        await logout().catch(() => undefined);
        setError("This sign-in is for company travel administrators. Employees use the RideGrid Corporate Employee App.");
        return;
      }
      router.replace("/corporate-admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div>
      <label htmlFor="corp-email" className="mb-2 block text-sm font-medium text-neutral-700">Work email or mobile</label>
      <div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-neutral-400" aria-hidden/>
        <input id="corp-email" type="text" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" className="w-full rounded-xl border border-neutral-300 py-3 pl-11 pr-4 outline-none focus:border-red-600"/></div>
    </div>
    <div>
      <label htmlFor="corp-password" className="mb-2 block text-sm font-medium text-neutral-700">Password</label>
      <div className="relative"><Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" aria-hidden/>
        <input id="corp-password" type={show ? "text" : "password"} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-neutral-300 py-3 pl-11 pr-12 outline-none focus:border-red-600"/>
        <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)} className="absolute right-3 top-3">{show ? <EyeOff className="h-5 w-5 text-neutral-500"/> : <Eye className="h-5 w-5 text-neutral-500"/>}</button></div>
    </div>
    <button disabled={busy} className="flex w-full items-center justify-center rounded-xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-70">{busy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Signing in…</> : "Sign in to Corporate Portal"}</button>
    <p className="text-center text-sm"><Link className="font-medium text-red-700 hover:underline" href="/forgot-password">Forgot password?</Link></p>
  </form>;
}
