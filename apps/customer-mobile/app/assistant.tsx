import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, styles, theme, ErrorText } from "../src/components/ui";
import { Badge, IconDisc } from "../src/components/Premium";
import { useApp } from "../src/state/Providers";
import { api } from "../src/services/api";
import { routeParams } from "../src/utils/routes";
import { label } from "../src/utils/journey";
import type { SavedRoute } from "../src/types";
type IconName = React.ComponentProps<typeof Ionicons>["name"];
// Chat-style planner. RideGuide is guided actions over live RideGrid data — it does
// not generate free-text answers, so every card below opens a real flow.
function Bubble({ children }: React.PropsWithChildren) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: theme.brand,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="sparkles" size={17} color="white" />
      </View>
      <View style={{ flex: 1, gap: 10 }}>{children}</View>
    </View>
  );
}
function Option({
  icon,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: `${tint}12`,
        borderWidth: 1,
        borderColor: `${tint}26`,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color="white" />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: tint, fontWeight: "800", fontSize: 14.5 }}>{title}</Text>
        <Text style={[styles.small, { fontSize: 12.5, lineHeight: 17 }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={tint} />
    </Pressable>
  );
}
export default function Assistant() {
  const { session } = useApp();
  const q = useQuery({
    queryKey: ["saved-routes", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) =>
      api<{ routes: SavedRoute[] }>("/api/mobile/routes", { signal }),
  });
  const first = session?.user.name?.split(" ")[0];
  return (
    <Screen
      title="RideGuide Planner"
      header={
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.line,
          }}
        >
          <IconDisc name="flash" size={46} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text accessibilityRole="header" style={[styles.heading, { fontSize: 18 }]}>
              RideGuide Planner
            </Text>
            <Text style={styles.small}>Your personal trip planner</Text>
          </View>
          <Badge text="Live data" tone="green" icon="radio-button-on" />
        </View>
      }
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search exact cars"
          onPress={() => router.push("/search")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minHeight: 52,
            paddingLeft: 16,
            paddingRight: 6,
            borderRadius: 26,
            backgroundColor: theme.field,
            borderWidth: 1,
            borderColor: theme.line,
          }}
        >
          <Text style={{ flex: 1, color: "#8A91A0", fontSize: 14.5 }}>
            Where would you like to go?
          </Text>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-forward" size={20} color="white" />
          </View>
        </Pressable>
      }
    >
      <Bubble>
        <View
          style={{
            backgroundColor: theme.field,
            borderRadius: 18,
            borderTopLeftRadius: 4,
            padding: 14,
            gap: 4,
          }}
        >
          <Text style={[styles.body, { fontWeight: "700" }]}>
            Hi{first ? ` ${first}` : ""}! How can I help you ride today?
          </Text>
          <Text style={[styles.small, { fontSize: 13.5 }]}>
            Pick an action and I'll take you straight to live availability and server fares.
          </Text>
        </View>
        <Option
          icon="navigate"
          tint={theme.success}
          title="Plan a trip"
          subtitle="Choose a route, dates and vehicle"
          onPress={() => router.push("/search")}
        />
        <Option
          icon="car-sport"
          tint={theme.blue}
          title="Compare available vehicles"
          subtitle="Search current availability and exact fares"
          onPress={() => router.push("/search")}
        />
        <Option
          icon="receipt"
          tint={theme.purple}
          title="Understand my booking"
          subtitle="Fare breakdown, payment and trip status"
          onPress={() => router.push("/(tabs)/trips")}
        />
        <Option
          icon="repeat"
          tint={theme.brand}
          title="Book a previous journey again"
          subtitle="Choose a trip, then request a fresh fare"
          onPress={() => router.push("/(tabs)/trips")}
        />
        <Option
          icon="headset"
          tint={theme.ink}
          title="Talk to support"
          subtitle="Call, email or WhatsApp the RideGrid team"
          onPress={() => router.push("/support")}
        />
      </Bubble>
      {!!q.data?.routes.length && (
        <Bubble>
          <View
            style={{
              backgroundColor: theme.field,
              borderRadius: 18,
              borderTopLeftRadius: 4,
              padding: 14,
            }}
          >
            <Text style={[styles.body, { fontWeight: "700" }]}>
              Here are your saved routes. Tap one to check fares for new dates.
            </Text>
          </View>
          {q.data.routes.slice(0, 3).map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Check fares for ${r.pickupCity}`}
              onPress={() =>
                router.push({ pathname: "/search", params: routeParams(r) })
              }
              style={({ pressed }) => [
                styles.card,
                { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconDisc name="bookmark" size={38} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
                  {r.pickupCity} → {r.dropCity.replaceAll("|", ", ") || r.packageName}
                </Text>
                <Text style={[styles.small, { fontSize: 12 }]}>{label(r.category)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.muted} />
            </Pressable>
          ))}
        </Bubble>
      )}
      <ErrorText error={q.error} />
    </Screen>
  );
}
