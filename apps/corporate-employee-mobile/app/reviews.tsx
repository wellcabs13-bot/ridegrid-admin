import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card, EmptyState, ErrorState, LoadingState, Row, Screen, T, colors } from "../src/components/ui";
import { ApprovalBadge } from "../src/components/Corporate";
import { corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Review } from "../src/types";
import { dateTime, label, money } from "../src/utils/journey";

// ApproverQueue: only requests whose current step the server assigned to this employee.
export default function Reviews() {
  const { session } = useApp();
  const q = useQuery({
    queryKey: ["reviews", session?.user.id],
    queryFn: ({ signal }) => corp<{ items: Review[] }>("approver-queue", "", signal),
    enabled: !!session,
    refetchInterval: 60000,
  });
  const items = q.data?.items || [];
  return (
    <Screen title="Requests to review" subtitle="Colleagues' rides waiting for your decision." scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        data={items}
        keyExtractor={(r) => r.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <T muted size={13}>You see a request only while its current step is assigned to you. After you decide, it moves to the next approver or back to the traveller.</T>
            <ErrorState error={q.error} retry={() => void q.refetch()} />
          </View>
        }
        ListEmptyComponent={q.isPending ? <LoadingState /> : q.isError ? null : <EmptyState title="Nothing to review" body="Ride requests assigned to you for approval appear here." icon="checkmark-done-outline" />}
        renderItem={({ item }) => {
          const r = item.ride;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Review request from ${item.employee.name}`} onPress={() => router.push({ pathname: "/review", params: { id: item.id } })}>
              <Card tone={colors.amber}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T weight="700">{item.employee.name}</T>
                    <T muted size={12}>{[item.employee.code, item.employee.department].filter(Boolean).join(" · ")}</T>
                  </View>
                  <ApprovalBadge status={item.status} />
                </Row>
                {r && <T size={15} weight="600">{r.route.pickupCity}{r.route.dropCity ? ` to ${r.route.dropCity.replaceAll("|", ", ")}` : ""}</T>}
                {r && <T muted size={13}>{dateTime(r.pickupDateTime)} · {r.vehicle.make} {r.vehicle.model} · {label(r.vehicle.category)}</T>}
                <T size={13}>{money(item.amount)} · {item.steps.find((s) => s.status === "PENDING")?.approver ?? label(item.currentStage)} step · submitted {dateTime(item.submittedAt)}</T>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
