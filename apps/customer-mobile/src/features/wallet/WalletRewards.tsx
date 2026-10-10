import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Screen,
  Card,
  SignedIn,
  Loading,
  ErrorText,
  Button,
  styles,
  theme,
  shadow,
} from "../../components/ui";
import { Divider, IconDisc, MenuRow, SectionHeader } from "../../components/Premium";
import { useApp } from "../../state/Providers";
import { api } from "../../services/api";
import { formatDate } from "../../utils/when";
import { label } from "../../utils/journey";
type Rewards = {
  account: null | {
    totalPoints: number;
    transactions: {
      id: string;
      points: number;
      description: string | null;
      transactionType: string;
      createdAt: string;
    }[];
  };
};
// The reference's red wallet card. RideGrid has no customer wallet balance (the config
// reports wallet: false), so the card shows the real loyalty points from the rewards
// API; bookings are paid at checkout through PayU.
export function WalletRewards() {
  const { session } = useApp();
  const q = useQuery({
    queryKey: ["rewards", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) => api<Rewards>("/api/mobile/rewards", { signal }),
  });
  const points = q.data?.account?.totalPoints ?? 0;
  const tx = q.data?.account?.transactions || [];
  return (
    <Screen
      title="Wallet & Rewards"
      subtitle="Your RideGrid points and payment information."
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <SignedIn>
        <LinearGradient
          colors={[theme.brand, theme.brandDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 20, gap: 6, overflow: "hidden", ...shadow }}
        >
          <View
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "#FFFFFF1A",
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="gift" size={18} color="white" />
            <Text style={{ color: "#FFE3E5", fontSize: 13, fontWeight: "700" }}>
              RideGrid Rewards
            </Text>
          </View>
          <Text style={{ color: "white", fontSize: 38, fontWeight: "800", letterSpacing: -1 }}>
            {points.toLocaleString("en-IN")}
            <Text style={{ fontSize: 16, fontWeight: "700" }}> points</Text>
          </Text>
          <Text style={{ color: "#FFE3E5", fontSize: 12.5, lineHeight: 18 }}>
            {q.data?.account
              ? "Points are not cash. Redemption is not available in this app."
              : "If points are awarded to your account, they will appear here."}
          </Text>
        </LinearGradient>
        {q.isPending && <Loading />}
        <ErrorText error={q.error} />
        {q.isError && (
          <Button title="Retry rewards" onPress={() => void q.refetch()} />
        )}
        <Card>
          <MenuRow
            icon="card-outline"
            tint={theme.blue}
            title="Payments"
            subtitle="Pay securely online with PayU — UPI, cards, net banking"
            onPress={() => router.push("/(tabs)/trips")}
          />
          <Divider />
          <MenuRow
            icon="car-outline"
            title="My trips"
            subtitle="Payment status for each booking"
            onPress={() => router.push("/(tabs)/trips")}
          />
          <Divider />
          <MenuRow
            icon="bookmark-outline"
            tint={theme.purple}
            title="Saved routes"
            subtitle="Favourite journeys and fare watches"
            onPress={() => router.push("/saved-routes")}
          />
        </Card>
        {!!tx.length && (
          <>
            <SectionHeader title="Points history" icon="time" />
            <Card>
              {tx.map((t, i) => (
                <View key={t.id} style={{ gap: 12 }}>
                  {i > 0 && <Divider />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <IconDisc
                      name={t.points >= 0 ? "add-circle" : "remove-circle"}
                      size={38}
                      tint={t.points >= 0 ? theme.success : theme.brand}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.body, { fontWeight: "600" }]} numberOfLines={2}>
                        {t.description || label(t.transactionType)}
                      </Text>
                      <Text style={[styles.small, { fontSize: 12 }]}>
                        {label(t.transactionType)} · {formatDate(t.createdAt.slice(0, 10))}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontWeight: "800",
                        fontSize: 15,
                        color: t.points >= 0 ? theme.success : theme.brand,
                      }}
                    >
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </SignedIn>
    </Screen>
  );
}
