import Link from "next/link";
export default function RegisterPage() {
  return <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4"><section className="w-full max-w-md rounded-2xl bg-white p-8">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-red-600">RideGrid</p><h1 className="mt-3 text-2xl font-bold">Account access</h1>
    <p className="mt-4 text-sm leading-6 text-neutral-600">Dashboard accounts are managed by your RideGrid administrator. Contact your administrator to request access or update your role.</p>
    <p className="mt-3 text-sm leading-6 text-neutral-600">Customers can begin with a marketplace booking using the existing customer account workflow.</p>
    <div className="mt-6 flex flex-wrap gap-4"><Link className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white" href="/marketplace">Find a ride</Link><Link className="px-4 py-3 text-sm font-medium" href="/login">Back to login</Link></div>
  </section></main>;
}
