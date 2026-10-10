import { Badge, IconDisc } from "../../src/components/Premium";
import { FlatList, Pressable, Text, View } from "react-native";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { NoticePage } from "../../src/types";
import {
  Button,
  Empty,
  ErrorText,
  Loading,
  SignedIn,
  styles,
  theme,
} from "../../src/components/ui";
export default function Inbox() {
  const { session, online } = useApp();
  const client = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["inbox", session?.user.id],
    initialPageParam: 1,
    enabled: !!session,
    queryFn: ({ pageParam, signal }) =>
      api<NoticePage>(`/api/mobile/notifications?page=${pageParam}`, {
        signal,
      }),
    getNextPageParam: (p) => (p.hasMore ? p.page + 1 : undefined),
  });
  const mark = useMutation({
    mutationFn: (id: string) =>
      api("/api/mobile/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["inbox"] }),
        client.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
  const unread = q.data?.pages[0].unread;
  return (
    <View style={styles.screen}>
      <SignedIn>
        <FlatList
          contentContainerStyle={styles.content}
          data={q.data?.pages.flatMap((p) => p.items) || []}
          keyExtractor={(n) => n.id}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={styles.title}>Updates</Text>
                <Text style={styles.subtitle}>
                  {q.data
                    ? unread
                      ? `${unread} unread`
                      : "You're all caught up"
                    : "Booking and account updates"}
                </Text>
              </View>
              {!online && (
                <ErrorText error="Offline. Showing previously loaded updates." />
              )}
              <ErrorText error={q.error || mark.error} />
              {q.isError && (
                <Button title="Retry inbox" onPress={() => void q.refetch()} />
              )}
            </View>
          }
          ListEmptyComponent={
            q.isPending ? (
              <Loading />
            ) : (
              <Empty
                icon="notifications-outline"
                title="You're all caught up"
                body="Notifications from RideGrid will appear here."
              />
            )
          }
          renderItem={({ item: n }) => {
            const booking = n.target?.type === "booking" ? n.target : null;
            const isNew = !n.readAt;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  booking ? `${n.title}. Open booking ${booking.bookingNumber}` : n.title
                }
                onPress={() => {
                  if (isNew && online) mark.mutate(n.id);
                  if (booking)
                    router.push({ pathname: "/bookings/[id]", params: { id: booking.id } });
                }}
                style={({ pressed }) => [
                  styles.card,
                  { flexDirection: "row", gap: 12, padding: 14 },
                  isNew && { borderColor: `${theme.brand}40`, backgroundColor: "#FFFAFA" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <IconDisc name={booking ? "car" : "notifications"} size={42} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.body, { fontWeight: "700", flex: 1 }]}>{n.title}</Text>
                    {isNew && (
                      <View
                        style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.brand }}
                      />
                    )}
                  </View>
                  <Text style={[styles.body, { color: theme.muted, fontSize: 14, lineHeight: 20 }]}>
                    {n.message}
                  </Text>
                  <Text style={[styles.small, { fontSize: 12 }]}>
                    {new Date(n.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                  </Text>
                  {(booking || isNew) && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 }}>
                      {booking && <Badge text={`Open booking ${booking.bookingNumber}`} icon="arrow-forward" />}
                      {isNew && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Mark as read"
                          disabled={!online || mark.isPending}
                          hitSlop={8}
                          onPress={() => mark.mutate(n.id)}
                        >
                          <Text
                            style={{
                              color: online ? theme.muted : "#C2C7D0",
                              fontSize: 12.5,
                              fontWeight: "700",
                            }}
                          >
                            Mark as read
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            q.hasNextPage ? (
              <Button
                title="Load older updates"
                secondary
                busy={q.isFetchingNextPage}
                onPress={() => void q.fetchNextPage()}
              />
            ) : null
          }
        />
      </SignedIn>
    </View>
  );
}
