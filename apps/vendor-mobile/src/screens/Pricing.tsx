import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  Label,
  Screen,
  State,
  dateTime,
  money,
  name,
} from "../components/ui";
import { api } from "../services/api";
import { useSave } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Pricing as Data } from "../types";
export default function Pricing() {
  const { session, online } = useApp();
  const q = useQuery({
    queryKey: [session?.user.id, "pricing"],
    queryFn: ({ signal }) =>
      api<Data>("/api/pricing/manage?view=simple", { signal }),
    enabled: !!session,
  });
  const save = useSave<{ pending: number; approved: number }>(
    "/api/pricing/manage",
  );
  const [form, setForm] = useState<Record<string, string>>({
      service: "LOCAL",
      package: "8_80",
      fare: "",
      extraKm: "",
      extraHour: "",
      kmPerDay: "",
      perKm: "",
      driverAllowance: "",
      effectiveFrom: "",
    }),
    [vehicleId, setVehicleId] = useState("");
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const [validation, setValidation] = useState("");
  async function submit() {
    setValidation("");
    const pair = q.data?.pairs.find((p) => p.id === vehicleId);
    if (!pair || !q.data) {
      setValidation("Choose a vehicle and driver pair.");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.effectiveFrom) ||
      !Number.isFinite(Date.parse(`${form.effectiveFrom}:00+05:30`))
    ) {
      setValidation(
        "Enter a future start time in YYYY-MM-DDTHH:mm format (IST).",
      );
      return;
    }
    const expectedVersions: Record<string, number> = {};
    for (const rate of q.data.rates)
      expectedVersions[rate.scopeKey] = Math.max(
        expectedVersions[rate.scopeKey] || 0,
        rate.version,
      );
    try {
      await save.mutateAsync({
        ...form,
        action: "simple-rates",
        vendorId: q.data.vendorId,
        pairs: [{ vehicleId: pair.id, driverId: pair.driverId }],
        destinations: [form.destination],
        effectiveFrom: new Date(`${form.effectiveFrom}:00+05:30`).toISOString(),
        expectedVersions,
      });
    } catch {}
  }
  return (
    <Screen
      title="Vendor pricing"
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <Label muted>
        Submit your rates to the existing approval workflow. Customer totals,
        GST and platform fees are managed centrally.
      </Label>
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {q.data && (
        <>
          <Card>
            <Chips
              values={["LOCAL", "ONE_WAY", "ROUNDTRIP"]}
              value={form.service}
              onChange={(v) => set("service", v)}
            />
            <Label>Vehicle & aligned driver</Label>
            {q.data.pairs.map((p) => (
              <Button
                key={p.id}
                title={`${vehicleId === p.id ? "✓ " : ""}${p.registrationNumber} · ${name(p.driver)}`}
                onPress={() => setVehicleId(p.id)}
              />
            ))}
            {!q.data.pairs.length && (
              <Label muted>
                No eligible vehicle-driver pairs. Review fleet verification and
                driver alignment.
              </Label>
            )}
            <Label>Pickup city</Label>
            <Chips
              values={q.data.cities}
              value={form.city}
              onChange={(v) => set("city", v)}
            />
            {form.service !== "LOCAL" && (
              <>
                <Label>
                  {form.service === "ROUNDTRIP" ? "Visit city" : "Drop city"}
                </Label>
                <Chips
                  values={q.data.cities.filter((c) => c !== form.city)}
                  value={form.destination}
                  onChange={(v) => set("destination", v)}
                />
              </>
            )}
            {form.service === "LOCAL" && (
              <>
                <Label>Package</Label>
                <Chips
                  values={["8_80", "12_120"]}
                  value={form.package}
                  onChange={(v) => set("package", v)}
                />
              </>
            )}
            {(form.service === "ROUNDTRIP"
              ? [
                  ["kmPerDay", "KM / day"],
                  ["perKm", "Rate / KM"],
                  ["driverAllowance", "Driver allowance / day"],
                ]
              : form.service === "LOCAL"
                ? [
                    ["fare", "Base rate"],
                    ["extraKm", "Extra KM"],
                    ["extraHour", "Extra hour"],
                  ]
                : [["fare", "Base rate"]]
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={form[key]}
                onChangeText={(v) => set(key, v)}
                numeric
              />
            ))}
            <Field
              label="Effective from (IST): YYYY-MM-DDTHH:mm"
              value={form.effectiveFrom}
              onChangeText={(v) => set("effectiveFrom", v)}
            />
            {!!validation && <Label>{validation}</Label>}
            <State error={save.error} />
            {save.isSuccess && (
              <Label>
                {save.data.pending} rate(s) pending approval.{" "}
                {save.data.approved} approved.
              </Label>
            )}
            <Button
              title={save.isPending ? "Submitting…" : "Submit rates"}
              disabled={!online || save.isPending || !q.data.pairs.length}
              onPress={submit}
            />
          </Card>
          <Label large>Rate history</Label>
          {q.data.rates.map((r) => (
            <Card key={r.id}>
              <Badge value={r.status} />
              <Label>
                {r.service} · {r.city}
              </Label>
              <Label muted>
                {r.pricingPackage?.vehicle.registrationNumber} ·{" "}
                {r.pricingPackage?.packageName}
              </Label>
              <Label>Vendor fare {money(r.fare)}</Label>
              <Label muted>
                Version {r.version} · {dateTime(r.effectiveFrom)}
              </Label>
            </Card>
          ))}
          {!q.data.rates.length && <Label muted>No rates submitted.</Label>}
          {q.data.rates.length === 500 && (
            <Label muted>
              Latest 500 versions shown. Older history is available through
              Operations.
            </Label>
          )}
        </>
      )}
    </Screen>
  );
}
