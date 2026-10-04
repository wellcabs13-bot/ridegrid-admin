import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useRows, useSave } from "../src/services/vendor";
import { useApp } from "../src/state/Providers";
import { BottomCTA, Button, Card, Chips, Notice, Screen, State, name } from "../src/components/ui";
import type { Driver } from "../src/types";
export default function Assignment() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>(),
    q = useRows<Driver>("drivers", { status: "ACTIVE" }),
    save = useSave("assignment"),
    { online } = useApp();
  const [driverId, setDriverId] = useState("");
  const drivers = q.data?.pages.flatMap((p) => p.items) || [];
  return (
    <Screen
      title="Align a Driver"
      footer={<BottomCTA title="Confirm Alignment" icon="checkmark-circle" busy={save.isPending} disabled={!driverId || !online} onPress={() => save.mutate({ vehicleId, driverId })} />}
    >
      <Notice tone="blue" text="Bookings and eligibility are checked by RideGrid before any change. Existing bookings require Operations to resolve first." />
      <State loading={q.isPending} error={q.error || save.error} retry={() => q.refetch()} />
      {!!drivers.length && (
        <Card>
          <Chips values={drivers.map((d) => d.id)} value={driverId} onChange={setDriverId} label={(id) => name(drivers.find((d) => d.id === id))} />
        </Card>
      )}
      {!q.isPending && !q.error && !drivers.length && <State empty emptyIcon="people-outline" emptyTitle="No active drivers" emptyText="Add a driver or mark one active first." />}
      {q.hasNextPage && <Button title="More drivers" variant="secondary" compact onPress={() => q.fetchNextPage()} />}
      {save.isSuccess && <Notice tone="green" icon="checkmark-circle" text="Driver alignment saved." />}
    </Screen>
  );
}
