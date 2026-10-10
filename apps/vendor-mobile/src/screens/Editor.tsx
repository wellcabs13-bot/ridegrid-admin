import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { BottomCTA, Button, Card, Chips, colors, Field, IconTile, Label, Notice, Screen, SectionTitle, State } from "../components/ui";
import { useSave, useVendor, useRows } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Config, Driver, Vehicle } from "../types";

const LABELS: Record<string, string> = {
  registrationNumber: "Registration number",
  make: "Make",
  model: "Model",
  homeCity: "Home city",
  seatingCapacity: "Seating capacity",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  mobile: "Mobile number",
  licenseNumber: "Driving licence number",
  city: "City",
  category: "Vehicle type",
  fuelType: "Fuel type",
  transmission: "Transmission",
};

export default function Editor({ kind }: { kind: "vehicle" | "driver" }) {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    { online } = useApp(),
    section = kind === "vehicle" ? "fleet" : "drivers";
  const q = useVendor<Vehicle & Driver>(section, id ? `?id=${encodeURIComponent(id)}` : "?page=1"),
    config = useVendor<Config>("config");
  const vehicles = useRows<Vehicle>("fleet", {}),
    save = useSave<{ id: string; activationEmailSent?: boolean; email?: string | null; temporaryPassword?: string | null }>(section);
  const [form, setForm] = useState<Record<string, string>>({ category: "SEDAN", fuelType: "DIESEL", transmission: "MANUAL", seatingCapacity: "4" });
  useEffect(() => {
    if (id && q.data)
      setForm(Object.fromEntries(Object.entries(q.data).filter(([, v]) => typeof v === "string" || typeof v === "number").map(([k, v]) => [k, String(v)])));
  }, [id, q.data]);
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const fields =
    kind === "vehicle"
      ? ["registrationNumber", "make", "model", "homeCity", "seatingCapacity"]
      : id
        ? ["firstName", "lastName", "city"]
        : ["firstName", "lastName", "email", "mobile", "licenseNumber", "city"];
  async function submit() {
    try {
      const result = await save.mutateAsync({ ...form, id });
      if (kind === "driver" && !id)
        Alert.alert(
          "Driver added",
          (result.temporaryPassword
            ? `Temporary password (shown only once — share it securely):

${result.temporaryPassword}

The driver signs in to the RideGrid Driver app with email or mobile number and must set a new password at first sign-in. `
            : "") +
            (result.activationEmailSent
              ? `An activation email was also sent to ${result.email ?? "the driver"}.`
              : "The activation email could not be sent; the driver can also use Forgot Password."),
        );
      router.replace({ pathname: kind === "vehicle" ? "/vehicle" : "/driver", params: { id: result.id } });
    } catch {}
  }
  const unassigned = vehicles.data?.pages.flatMap((p) => p.items).filter((v) => !v.driverId) || [];
  return (
    <Screen
      title={`${id ? "Edit" : "Add"} ${kind === "vehicle" ? "Vehicle" : "Driver"}`}
      footer={
        <BottomCTA
          title={id ? "Save Changes" : kind === "vehicle" ? "Add Vehicle" : "Add Driver"}
          icon="checkmark-circle"
          busy={save.isPending}
          disabled={!online || (!!id && !q.data)}
          note={!online ? "Reconnect to save." : undefined}
          onPress={() => void submit()}
        />
      }
    >
      <State loading={!!id && q.isPending} error={q.error || config.error} retry={() => { q.refetch(); config.refetch(); }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconTile icon={kind === "vehicle" ? "car-sport" : "person"} tone="red" size={52} solid />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: "900", color: colors.text }}>{kind === "vehicle" ? "Vehicle details" : "Driver details"}</Text>
          <Label small muted>
            {id ? "Update the details RideGrid holds for this record." : "Documents are uploaded from the details screen after saving."}
          </Label>
        </View>
      </View>
      <Card>
        {fields.map((key) => (
          <Field key={key} label={LABELS[key] || key} value={form[key] || ""} onChangeText={(v) => set(key, v)} numeric={key === "seatingCapacity"} keyboardType={key === "email" ? "email-address" : "default"} />
        ))}
      </Card>
      {kind === "vehicle" && config.data && (
        <Card>
          {(
            [
              ["category", config.data.categories],
              ["fuelType", config.data.fuels],
              ["transmission", config.data.transmissions],
            ] as const
          ).map(([key, values]) => (
            <View key={key} style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>{LABELS[key]}</Text>
              <Chips values={values} value={form[key]} onChange={(v) => set(key, v)} />
            </View>
          ))}
        </Card>
      )}
      {kind === "driver" && !id && (
        <>
          <SectionTitle title="Link to a vehicle" sub="Optional · vehicles without a driver" icon="car-sport-outline" tone="blue" />
          <Card>
            <Chips values={unassigned.map((v) => v.id)} value={form.vehicleId} onChange={(v) => set("vehicleId", v)} label={(vid) => unassigned.find((v) => v.id === vid)?.registrationNumber || vid} />
            {vehicles.hasNextPage && <Button title="More vehicles" variant="secondary" compact onPress={() => vehicles.fetchNextPage()} />}
            <State error={vehicles.error} loading={vehicles.isPending} />
            {!vehicles.isPending && !unassigned.length && <Label small muted>No unassigned vehicle on this page. Add a vehicle or load the next page.</Label>}
          </Card>
          <Notice tone="blue" icon="key-outline" text="RideGrid creates a temporary password. The driver must set a new password at first sign-in, or can use Forgot Password." />
        </>
      )}
      <State error={save.error} />
    </Screen>
  );
}
