import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Label,
  Screen,
  State,
  name,
} from "../components/ui";
import { useVendor } from "../services/vendor";
type Data = {
  hasMore: boolean;
  date: string;
  vehicles: {
    id: string;
    registrationNumber: string;
    status: string;
    available: boolean;
  }[];
  drivers: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    available: boolean;
  }[];
};
export default function Availability() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const [date, setDate] = useState(today),
    [selected, setSelected] = useState(today),
    [page, setPage] = useState(1);
  const q = useVendor<Data>(
    "availability",
    `?date=${encodeURIComponent(selected)}&page=${page}`,
  );
  return (
    <Screen
      title="Availability"
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <Label muted>
        Asia/Kolkata calendar day. Reservation conflicts are checked by
        RideGrid.
      </Label>
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Button
        title="Check date"
        onPress={() => {
          setSelected(date);
          setPage(1);
        }}
      />
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {q.data && (
        <>
          <Label large>Vehicles · {q.data.date}</Label>
          {q.data.vehicles.map((v) => (
            <Card key={v.id}>
              <Label>{v.registrationNumber}</Label>
              <Badge value={v.available ? "AVAILABLE" : "UNAVAILABLE"} />
              <Label muted>Fleet status: {v.status}</Label>
            </Card>
          ))}
          {!q.data.vehicles.length && <State empty />}
          <Label large>Drivers</Label>
          {q.data.drivers.map((d) => (
            <Card key={d.id}>
              <Label>{name(d)}</Label>
              <Badge value={d.available ? "AVAILABLE" : "UNAVAILABLE"} />
              <Label muted>Account status: {d.status}</Label>
            </Card>
          ))}
          {!q.data.drivers.length && <State empty />}
          {page > 1 && (
            <Button
              title="Previous page"
              onPress={() => setPage((p) => p - 1)}
            />
          )}
          {q.data.hasMore && (
            <Button title="Next page" onPress={() => setPage((p) => p + 1)} />
          )}
        </>
      )}
    </Screen>
  );
}
