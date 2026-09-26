import { FlatList, View } from "react-native";
import {
  Button,
  Card,
  Label,
  Screen,
  State,
  dateTime,
  s,
} from "../components/ui";
import { useRows, useSave } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Notice } from "../types";
export default function Notifications() {
  const q = useRows<Notice>("notifications", {}),
    save = useSave("notifications"),
    { online } = useApp();
  return (
    <Screen title="Notifications" scroll={false}>
      <FlatList
        contentContainerStyle={s.body}
        data={q.data?.pages.flatMap((p) => p.items) || []}
        keyExtractor={(n) => n.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <State
            loading={q.isPending}
            error={q.error || save.error}
            retry={() => q.refetch()}
          />
        }
        ListEmptyComponent={!q.isPending ? <State empty /> : null}
        renderItem={({ item: n }) => (
          <Card>
            <Label large>{n.title}</Label>
            <Label>{n.message}</Label>
            <Label muted>{dateTime(n.createdAt)}</Label>
            {!n.readAt && (
              <Button
                title="Mark read"
                disabled={!online || save.isPending}
                onPress={() => save.mutate({ id: n.id })}
              />
            )}
          </Card>
        )}
        ListFooterComponent={
          q.hasNextPage ? (
            <Button title="Load more" onPress={() => q.fetchNextPage()} />
          ) : null
        }
      />
    </Screen>
  );
}
