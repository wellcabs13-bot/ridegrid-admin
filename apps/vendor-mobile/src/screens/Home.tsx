import { View } from "react-native";
import {
  BookingCard,
  Card,
  Label,
  LinkButton,
  Screen,
  State,
  colors,
} from "../components/ui";
import { useVendor } from "../services/vendor";
import type { Home as HomeData } from "../types";
export default function Home() {
  const q = useVendor<HomeData>("home"),
    d = q.data;
  return (
    <Screen
      title="Operations today"
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          <Label muted>
            Asia/Kolkata · updated {new Date(d.asOf).toLocaleTimeString()}
          </Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {(
              [
                ["Today's bookings", d.todayBookings],
                ["Upcoming", d.upcoming],
                ["Active trips", d.active],
                ["Need a driver", d.pending],
                ["Available vehicles", d.availableVehicles],
                ["Booked vehicles", d.bookedVehicles],
                ["Available drivers", d.availableDrivers],
                ["Reserved drivers", d.assignedDrivers],
              ] as const
            ).map(([label, count]) => (
              <View key={label} style={{ flexBasis: "45%", flexGrow: 1 }}>
                <Card>
                  <Label large>{count}</Label>
                  <Label muted>{label}</Label>
                </Card>
              </View>
            ))}
          </View>
          {(d.attentionVehicles > 0 || d.expiringDocuments > 0) && (
            <Card>
              <Label>{d.attentionVehicles} vehicles need attention</Label>
              <Label>
                {d.expiringDocuments} vehicle documents expire within 30 days or
                have expired
              </Label>
              <LinkButton title="Review fleet" href="/fleet" />
            </Card>
          )}
          <Label large>Next trips</Label>
          {d.nextTrips.length ? (
            d.nextTrips.map((b) => <BookingCard key={b.id} booking={b} />)
          ) : (
            <Card>
              <Label muted>No upcoming trips.</Label>
            </Card>
          )}
          <LinkButton title="Check availability" href="/availability" />
          <Label large>Latest updates</Label>
          {d.notifications.map((n) => (
            <Card key={n.id}>
              <Label>{n.title}</Label>
              <Label muted>{n.message}</Label>
            </Card>
          ))}
          {!d.notifications.length && (
            <Label muted>No recent notifications.</Label>
          )}
        </>
      )}
    </Screen>
  );
}
