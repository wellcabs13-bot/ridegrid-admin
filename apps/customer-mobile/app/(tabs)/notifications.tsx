import { Badge } from "../../src/components/Premium";
import { FlatList, Text, View } from "react-native";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { NoticePage } from "../../src/types";
import {
  Card,
  Button,
  Empty,
  ErrorText,
  Loading,
  SignedIn,
  styles,
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
  return (
    <View style={styles.screen}>
      <SignedIn>
        <FlatList
          contentContainerStyle={styles.content}
          data={q.data?.pages.flatMap((p) => p.items) || []}
          keyExtractor={(n) => n.id}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <Text style={styles.title}>Your updates</Text>
              <Text style={styles.subtitle}>
                {q.data
                  ? `${q.data.pages[0].unread} unread`
                  : "Booking and account updates"}
              </Text>
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
                title="You're all caught up"
                body="Notifications from RideGrid will appear here."
              />
            )
          }
          renderItem={({ item: n }) => (
            <Card>
              {!n.readAt && (
                <Badge text="NEW UPDATE" icon="notifications-outline" />
              )}
              <Text style={styles.heading}>{n.title}</Text>
              <Text style={styles.body}>{n.message}</Text>
              <Text style={styles.small}>
                {new Date(n.createdAt).toLocaleString()}
              </Text>
              {!n.readAt && (
                <Button
                  title="Mark as read"
                  secondary
                  disabled={!online}
                  busy={mark.isPending}
                  onPress={() => mark.mutate(n.id)}
                />
              )}
            </Card>
          )}
          ListFooterComponent={
            q.hasNextPage ? (
              <Button
                title="Load older updates"
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
