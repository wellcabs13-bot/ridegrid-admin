import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, colors, dateTime, Label, Screen, State } from "../components/ui";
import { useRows, useSave } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Notice } from "../types";

export default function Notifications() {
  const q = useRows<Notice>("notifications", {}),
    save = useSave("notifications"),
    { online } = useApp();
  const unread = (q.data?.pages[0] as { unread?: number } | undefined)?.unread;
  return (
    <Screen title="Notifications" scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
        data={q.data?.pages.flatMap((p) => p.items) || []}
        keyExtractor={(n) => n.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            {!!unread && <Text style={{ fontSize: 14, fontWeight: "800", color: colors.brand }}>{unread} unread</Text>}
            <State loading={q.isPending} error={q.error || save.error} retry={() => q.refetch()} />
          </View>
        }
        ListEmptyComponent={!q.isPending && !q.error ? <Card><State empty emptyIcon="notifications-off-outline" emptyTitle="You're all caught up" emptyText="Booking and account updates will appear here." /></Card> : null}
        renderItem={({ item: n }) => (
          <Card style={!n.readAt ? { borderColor: "#F8D3D2", backgroundColor: "#FFFBFB" } : undefined}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: n.readAt ? "transparent" : colors.brand }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Label bold>{n.title}</Label>
                <Label>{n.message}</Label>
                <Label small muted>{dateTime(n.createdAt)}</Label>
              </View>
            </View>
            {(n.target?.type === "booking" || !n.readAt) && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                {n.target?.type === "booking" && (
                  <View style={{ flex: 1 }}>
                    <Button
                      compact
                      icon="open-outline"
                      title={`Open ${n.target.bookingNumber}`}
                      onPress={() => {
                        if (!n.readAt && online) save.mutate({ id: n.id });
                        router.push({ pathname: "/booking", params: { id: n.target!.id } });
                      }}
                    />
                  </View>
                )}
                {!n.readAt && (
                  <View style={{ flex: 1 }}>
                    <Button compact variant="secondary" icon="checkmark" title="Mark read" disabled={!online || save.isPending} onPress={() => save.mutate({ id: n.id })} />
                  </View>
                )}
              </View>
            )}
          </Card>
        )}
        ListFooterComponent={q.hasNextPage ? <View style={{ marginTop: 12 }}><Button title="Load more" variant="secondary" onPress={() => q.fetchNextPage()} /></View> : null}
      />
    </Screen>
  );
}
