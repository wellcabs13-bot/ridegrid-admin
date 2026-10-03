import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Label,
  LinkButton,
  Screen,
  State,
  dateTime,
  money,
} from "../components/ui";
import { useVendor } from "../services/vendor";
type Data = {
  wallet: { balance: string } | null;
  settlements: {
    id: string;
    netAmount: string;
    settlementStatus: string;
    createdAt: string;
    settledAt: string | null;
    settlementReference: string | null;
  }[];
  totals: { settlementStatus: string; _sum: { netAmount: string | null } }[];
  completed: {
    id: string;
    bookingNumber: string;
    vendorEarning: string | null;
  }[];
  hasMore: boolean;
};
export default function Earnings() {
  const [page, setPage] = useState(1),
    q = useVendor<Data>("earnings", `?page=${page}`),
    d = q.data;
  return (
    <Screen
      title="Earnings & settlements"
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          <Card>
            <Label muted>Recorded wallet balance</Label>
            <Label large>
              {d.wallet ? money(d.wallet.balance) : "Wallet not provisioned"}
            </Label>
            <Label muted>Amounts below are recorded by RideGrid Finance.</Label>
          </Card>
          {d.totals.map((t) => (
            <Card key={t.settlementStatus}>
              <Badge value={t.settlementStatus} />
              <Label large>{money(t._sum.netAmount)}</Label>
            </Card>
          ))}
          <Label large>Settlement history</Label>
          {d.settlements.map((t) => (
            <Card key={t.id}>
              <Badge value={t.settlementStatus} />
              <Label large>{money(t.netAmount)}</Label>
              <Label muted>{dateTime(t.settledAt || t.createdAt)}</Label>
              {t.settlementReference && <Label>{t.settlementReference}</Label>}
            </Card>
          ))}
          {!d.settlements.length && (
            <Label muted>No settlements recorded.</Label>
          )}
          <Label large>Completed trip earnings</Label>
          {d.completed.map((b) => (
            <Card key={b.id}>
              <LinkButton
                title={b.bookingNumber}
                href={`/booking?id=${b.id}`}
              />
              <Label>{money(b.vendorEarning)}</Label>
            </Card>
          ))}
          {!d.completed.length && (
            <Label muted>No completed trips on this page.</Label>
          )}
          {page > 1 && (
            <Button
              title="Previous page"
              onPress={() => setPage((p) => p - 1)}
            />
          )}
          {d.hasMore && (
            <Button title="Next page" onPress={() => setPage((p) => p + 1)} />
          )}
        </>
      )}
    </Screen>
  );
}
