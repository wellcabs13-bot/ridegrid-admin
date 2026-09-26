"use client";
import Link from "next/link";
import { useState } from "react";
export default function ForgotPasswordPage() {
  const [email,setEmail] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  return <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10"><div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-red-600">RideGrid account access</p>
    <h1 className="mt-3 text-2xl font-bold">Forgot password</h1>
    <p className="mt-3 text-sm leading-6 text-neutral-600">Request recovery for your existing account. If you do not receive a recovery link, contact your account administrator.</p>
    <form className="mt-6 space-y-4" onSubmit={async e => {
      e.preventDefault(); if(busy) return; setBusy(true); setError(""); setMessage("");
      try {
        const response=await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
        const result=await response.json();
        if(!response.ok || !result.success) throw new Error(result.message || "Unable to request password recovery.");
        setMessage(result.message || "If the account exists, a password reset link has been requested.");
      } catch(err) {setError(err instanceof Error ? err.message : "Unable to request recovery.");}
      finally {setBusy(false);}
    }}>
      <label htmlFor="recovery-email" className="block text-sm font-medium">Email address</label>
      <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 p-3 focus:outline-red-600"/>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-neutral-50 p-3 text-sm">{message}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-red-600 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Requesting…" : "Request password recovery"}</button>
    </form>
    <Link href="/login" className="mt-6 inline-block text-sm font-medium text-red-700">Back to login</Link>
  </div></main>;
}
