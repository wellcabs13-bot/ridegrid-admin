"use client";

import { Customer } from "@/types/customer-ui";

interface Props {
  customer: Customer;
}

export default function CustomerInfoCard({
  customer,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h3 className="mb-5 text-lg font-semibold">
        Customer Information
      </h3>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Info label="Customer ID" value={customer.id} />
        <Info label="Name" value={customer.name} />
        <Info label="Mobile" value={customer.mobile} />
        <Info label="Email" value={customer.email} />
        <Info label="City" value={customer.city} />

        <Info
          label="Joined On"
          value={new Date(
            customer.joinedOn
          ).toLocaleDateString("en-IN")}
        />

        <Info
          label="Preferred Vehicle"
          value={customer.preferredVehicle}
        />

        <Info
          label="Preferred Driver"
          value={customer.preferredDriver}
        />
      </div>
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}