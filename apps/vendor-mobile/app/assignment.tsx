import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useRows, useSave } from "../src/services/vendor";
import { useApp } from "../src/state/Providers";
import { Button, Card, Label, Screen, State, name } from "../src/components/ui";
import type { Driver } from "../src/types";
export default function Assignment() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>(),
    q = useRows<Driver>("drivers", { status: "ACTIVE" }),
    save = useSave("assignment"),
    { online } = useApp();
  const [driverId, setDriverId] = useState("");
  return (
    <Screen title="Align a driver">
      <Label muted>
        Bookings and eligibility are checked by RideGrid before any change.
        Existing bookings require Operations to resolve first.
      </Label>
      <State
        loading={q.isPending}
        error={q.error || save.error}
        retry={() => q.refetch()}
      />
      {q.data?.pages
        .flatMap((p) => p.items)
        .map((d) => (
          <Button
            key={d.id}
            title={`${driverId === d.id ? "✓ " : ""}${name(d)}`}
            onPress={() => setDriverId(d.id)}
          />
        ))}
      {q.hasNextPage && (
        <Button title="More drivers" onPress={() => q.fetchNextPage()} />
      )}
      {save.isSuccess && (
        <Card>
          <Label>Driver alignment saved.</Label>
        </Card>
      )}
      <Button
        title={save.isPending ? "Saving…" : "Confirm alignment"}
        disabled={!driverId || !online || save.isPending}
        onPress={() => save.mutate({ vehicleId, driverId })}
      />
    </Screen>
  );
}
