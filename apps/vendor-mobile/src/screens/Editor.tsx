import React, { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  Button,
  Card,
  Chips,
  Field,
  Label,
  Screen,
  State,
} from "../components/ui";
import { useSave, useVendor, useRows } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Config, Driver, Vehicle } from "../types";
export default function Editor({ kind }: { kind: "vehicle" | "driver" }) {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    { online } = useApp(),
    section = kind === "vehicle" ? "fleet" : "drivers";
  const q = useVendor<Vehicle & Driver>(
      section,
      id ? `?id=${encodeURIComponent(id)}` : "?page=1",
    ),
    config = useVendor<Config>("config");
  const vehicles = useRows<Vehicle>("fleet", {}),
    save = useSave<{ id: string }>(section);
  const [form, setForm] = useState<Record<string, string>>({
    category: "SEDAN",
    fuelType: "DIESEL",
    transmission: "MANUAL",
    seatingCapacity: "4",
  });
  useEffect(() => {
    if (id && q.data)
      setForm(
        Object.fromEntries(
          Object.entries(q.data)
            .filter(([, v]) => typeof v === "string" || typeof v === "number")
            .map(([k, v]) => [k, String(v)]),
        ),
      );
  }, [id, q.data]);
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const fields =
    kind === "vehicle"
      ? ["registrationNumber", "make", "model", "homeCity", "seatingCapacity"]
      : id
        ? ["firstName", "lastName", "city"]
        : ["firstName", "lastName", "email", "mobile", "licenseNumber", "city"];
  const title = (v: string) =>
    v.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
  async function submit() {
    try {
      const result = await save.mutateAsync({ ...form, id });
      router.replace({
        pathname: kind === "vehicle" ? "/vehicle" : "/driver",
        params: { id: result.id },
      });
    } catch {}
  }
  return (
    <Screen title={`${id ? "Edit" : "Add"} ${kind}`}>
      <State
        loading={!!id && q.isPending}
        error={q.error || config.error}
        retry={() => {
          q.refetch();
          config.refetch();
        }}
      />
      <Card>
        {fields.map((key) => (
          <Field
            key={key}
            label={title(key)}
            value={form[key] || ""}
            onChangeText={(v) => set(key, v)}
            numeric={key === "seatingCapacity"}
          />
        ))}
        {kind === "vehicle" &&
          config.data &&
          (
            [
              ["category", config.data.categories],
              ["fuelType", config.data.fuels],
              ["transmission", config.data.transmissions],
            ] as const
          ).map(([key, values]) => (
            <React.Fragment key={key}>
              <Label>{title(key)}</Label>
              <Chips
                values={values}
                value={form[key]}
                onChange={(v) => set(key, v)}
              />
            </React.Fragment>
          ))}
        {kind === "driver" && !id && (
          <>
            <Label>Link to a vehicle without a driver</Label>
            <Label muted>
              The driver can set a password using the existing password recovery
              flow.
            </Label>
            {vehicles.data?.pages
              .flatMap((p) => p.items)
              .filter((v) => !v.driverId)
              .map((v) => (
                <Button
                  key={v.id}
                  title={`${form.vehicleId === v.id ? "✓ " : ""}${v.registrationNumber}`}
                  onPress={() => set("vehicleId", v.id)}
                />
              ))}
            {vehicles.hasNextPage && (
              <Button
                title="More vehicles"
                onPress={() => vehicles.fetchNextPage()}
              />
            )}
            <State error={vehicles.error} loading={vehicles.isPending} />
            {!vehicles.isPending &&
              !vehicles.data?.pages
                .flatMap((p) => p.items)
                .some((v) => !v.driverId) && (
                <Label muted>
                  No unassigned vehicle on this page. Add a vehicle or load the
                  next page.
                </Label>
              )}
          </>
        )}
        <State error={save.error} />
        <Button
          title={save.isPending ? "Saving…" : "Save"}
          disabled={!online || save.isPending || (!!id && !q.data)}
          onPress={submit}
        />
      </Card>
    </Screen>
  );
}
