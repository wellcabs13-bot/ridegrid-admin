"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Confirm, send } from "@/components/admin/kit";

// Super Admin "Reset Login Password" for a vendor or driver. The temporary password
// lives only in this component's state and is discarded when the dialog closes.
export default function ResetLoginPassword({ kind, id, className = "rg-secondary" }: { kind: "vendors" | "drivers"; id: string; className?: string }) {
  const { user } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ login: string; temporaryPassword: string; loginActive: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  if (user?.role !== "SUPER_ADMIN") return null;

  const reset = async () => {
    setBusy(true); setError("");
    try {
      setResult(await send<{ login: string; temporaryPassword: string; loginActive: boolean }>(`/api/admin/${kind}/${id}/reset-password`, "POST", {}));
      setConfirm(false); setCopied(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Password reset failed."); } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.temporaryPassword); setCopied(true); } catch { setCopied(false); }
  };
  const close = () => { setResult(null); setCopied(false); };

  return <>
    <button type="button" className={className} onClick={() => { setError(""); setConfirm(true); }}>Reset Login Password</button>
    <Confirm open={confirm} title="Reset login password?" danger busy={busy} error={error} confirmLabel="Reset password"
      message="This will replace the current login password and require the user to set a new password on next login."
      onCancel={() => setConfirm(false)} onConfirm={() => void reset()} />
    {result && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true" aria-label="Temporary password">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold">Temporary password created</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div><dt className="text-neutral-500">Login</dt><dd className="mt-1 break-all font-semibold">{result.login}</dd></div>
          <div><dt className="text-neutral-500">Temporary Password</dt>
            <dd className="mt-1 flex items-center gap-2"><code className="flex-1 select-all break-all rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-base">{result.temporaryPassword}</code>
              <button type="button" className="rg-secondary" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button></dd></div>
        </dl>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">This password will not be shown again.</p>
        {!result.loginActive && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">This login is currently blocked; the user cannot sign in until the account is reinstated.</p>}
        <div className="mt-5 flex justify-end"><button type="button" className="rg-primary" onClick={close}>Done</button></div>
      </div>
    </div>}
  </>;
}
