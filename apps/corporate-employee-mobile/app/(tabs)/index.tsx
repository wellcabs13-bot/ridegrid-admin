import { Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, ErrorState, Heading, KeyValue, LoadingState, MenuRow, Row, Screen, T, colors } from "../../src/components/ui";
import { BudgetCard, CorporateHeader, TripCard } from "../../src/components/Corporate";
import { corp } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { Home } from "../../src/types";
import { money } from "../../src/utils/journey";

function Stat({ value, label, tone, onPress }: { value: number; label: string; tone: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${value} ${label}`} onPress={onPress} style={{ flex: 1, minWidth: 130 }}>
      <Card tone={value ? tone : undefined}>
        <T size={26} weight="800" color={value ? tone : colors.text}>{value}</T>
        <T muted size={13}>{label}</T>
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { session } = useApp();
  const q = useQuery({ queryKey: ["home", session?.user.id], queryFn: ({ signal }) => corp<Home>("home", "", signal), enabled: !!session });
  const h = q.data;
  const firstName = (h?.profile.name || session?.user.name || "").split(" ")[0];
  return (
    <Screen title={firstName ? `Hello, ${firstName}` : "Welcome"} subtitle="Your company travel at a glance." refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState rows={3} />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {h && (
        <>
          <CorporateHeader
            name={h.profile.name}
            company={h.profile.company.name}
            detail={[h.profile.branch?.name, h.profile.department].filter(Boolean).join(" · ") || undefined}
          />
          <Button title="Book a ride" icon="car-sport-outline" onPress={() => router.push("/book")} />
          <Row>
            <Stat value={h.pendingApprovals} label="Pending approvals" tone={colors.amber} onPress={() => router.push("/approvals")} />
            <Stat value={h.approvedToBook} label="Approved to book" tone={colors.emerald} onPress={() => router.push("/approvals")} />
          </Row>
          <Heading>Next trip</Heading>
          {h.upcoming ? <TripCard trip={h.upcoming} /> : <Card><T muted>No upcoming company rides.</T></Card>}
          {h.activeTrips > 0 && <MenuRow icon="navigate-circle-outline" title={`${h.activeTrips} trip in progress`} subtitle="Open My Trips to follow it" onPress={() => router.push("/trips")} />}
          <Card>
            <Heading>Travel policy</Heading>
            {h.policy ? (
              <>
                <KeyValue k="Policy" v={h.policy.name} />
                <KeyValue k="Trip limit" v={h.policy.maxTripAmount ? money(h.policy.maxTripAmount) : "No fixed limit"} />
                <KeyValue k="Approval" v={h.policy.approvalRequired ? "Required for every trip" : "Only outside policy"} />
              </>
            ) : (
              <T muted>Your company has not published an active travel policy. Rides are checked against your personal limits only.</T>
            )}
            <Button title="View full policy" secondary onPress={() => router.push("/policy")} />
          </Card>
          <BudgetCard budget={h.budget} />
          {h.unread > 0 && <MenuRow icon="notifications-outline" title={`${h.unread} unread update${h.unread === 1 ? "" : "s"}`} onPress={() => router.push("/notifications")} />}
        </>
      )}
    </Screen>
  );
}
