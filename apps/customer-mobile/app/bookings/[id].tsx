import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDateTime } from "../../src/utils/when";
import { TripStatus } from "../../src/components/TripStatus";
import {
  Avatar,
  Badge,
  Divider,
  RouteLine,
  SectionHeader,
} from "../../src/components/Premium";
import { routeParams, shareSummary } from "../../src/utils/routes";
import { Linking, Text, Share, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import {
  Screen,
  Card,
  Button,
  SignedIn,
  ErrorText,
  Loading,
  styles,
  theme,
} from "../../src/components/ui";
import { Fare } from "../../src/components/Fare";
import { bookingStatusLabel, bookingTone, label, money } from "../../src/utils/journey";
import type { BookingPage } from "../../src/types";
export default function Detail() {
  const { id, confirmed } = useLocalSearchParams<{
    id: string;
    confirmed?: string;
  }>();
  const { session } = useApp();
  const q = useQuery({
    queryKey: ["booking", session?.user.id, id],
    queryFn: ({ signal }) =>
      api<BookingPage>(`/api/mobile/bookings?id=${encodeURIComponent(id)}`, {
        signal,
      }),
    enabled: !!session && !!id,
  });
  const b = q.data?.bookings[0];
  const celebrate = !!confirmed && b?.status === "CONFIRMED";
  return (
    <Screen
      title={confirmed ? (celebrate ? "Booking Confirmed!" : "Booking received") : "Your booking"}
      subtitle={b?.bookingNumber}
      header={
        celebrate ? (
          <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: theme.successSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  backgroundColor: theme.success,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={42} color="white" />
              </View>
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: theme.success, textAlign: "center" }]}
            >
              Booking Confirmed!
            </Text>
            <Text style={[styles.subtitle, { textAlign: "center" }]}>
              Your ride is all set.{b ? ` ${b.pickupLocation} → ${b.dropLocation}` : ""}
            </Text>
          </View>
        ) : undefined
      }
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <SignedIn>
        {q.isPending ? <Loading /> : null}
        <ErrorText error={q.error} />
        {q.isError && (
          <Button title="Retry booking" onPress={() => void q.refetch()} />
        )}
        {b && (
          <>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.heading, { fontSize: 17 }]} numberOfLines={1}>
                    {b.vehicle.make} {b.vehicle.model}
                  </Text>
                  <Text style={styles.small} numberOfLines={1}>
                    {b.vendor.companyName}
                    {b.vehicle.registrationNumber ? ` · ${b.vehicle.registrationNumber}` : ""}
                  </Text>
                </View>
                <Badge
                  text={bookingStatusLabel(b.status)}
                  tone={bookingTone(b.status).tone}
                  icon={bookingTone(b.status).icon}
                />
              </View>
              <Divider />
              <RouteLine
                from={b.pickupLocation}
                to={b.dropLocation}
                fromCaption="Pickup"
                toCaption="Drop-off"
              />
              <Divider />
              <View style={styles.row}>
                <View style={{ gap: 2 }}>
                  <Text style={[styles.small, { fontSize: 11.5 }]}>Date &amp; time</Text>
                  <Text style={[styles.body, { fontWeight: "700" }]}>
                    {formatDateTime(b.pickupDateTime)} IST
                  </Text>
                </View>
                <View style={{ gap: 2, alignItems: "flex-end" }}>
                  <Text style={[styles.small, { fontSize: 11.5 }]}>Booking ID</Text>
                  <Text style={[styles.body, { fontWeight: "700" }]}>{b.bookingNumber}</Text>
                </View>
              </View>
              <Text style={styles.small}>
                {label(b.tripType)} · {b.tripDays} day(s)
              </Text>
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: theme.brandSoft,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  },
                ]}
              >
                <Text style={[styles.body, { fontWeight: "700" }]}>Total fare</Text>
                <Text style={{ color: theme.brand, fontSize: 24, fontWeight: "800", letterSpacing: -0.6 }}>
                  {money(b.finalFare ?? b.estimatedFare)}
                </Text>
              </View>
            </Card>
            <Card>
              <Text style={[styles.heading, { fontSize: 16 }]}>Your driver</Text>
              {b.driver ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar name={`${b.driver.firstName} ${b.driver.lastName}`} size={46} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.body, { fontWeight: "700" }]}>
                        {b.driver.firstName} {b.driver.lastName}
                      </Text>
                      <Text style={styles.small}>{b.vendor.companyName}</Text>
                    </View>
                  </View>
                  {b.driver.user.mobile && (
                    <Button
                      title="Call driver"
                      icon="call"
                      outline
                      onPress={() =>
                        void Linking.openURL(
                          `tel:${b.driver!.user.mobile!.replace(/[^+\d]/g, "")}`,
                        )
                      }
                    />
                  )}
                </>
              ) : (
                <Text style={styles.small}>Driver assignment is pending.</Text>
              )}
            </Card>
            {b.status === "AWAITING_PAYMENT" && (
              <Card>
                <Text style={styles.heading}>Payment not confirmed yet</Text>
                <Text style={styles.small}>
                  The vehicle is held briefly while PayU confirms your payment. Check the status, or retry the payment while the hold lasts.
                </Text>
                <Button
                  title="Check payment status"
                  onPress={() =>
                    router.push({
                      pathname: "/payment-return",
                      params: { bookingId: b.id, bookingNumber: b.bookingNumber },
                    })
                  }
                />
              </Card>
            )}
            <TripStatus booking={b} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Share trip"
                  icon="share-outline"
                  outline
                  onPress={() => {
                    void Share.share({ message: shareSummary(b) }).catch(() => {});
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="My trips"
                  secondary
                  onPress={() => router.push("/(tabs)/trips")}
                />
              </View>
            </View>
            {b.rebook && (
              <Button
                title="Quick rebook"
                icon="repeat"
                onPress={() =>
                  router.push({
                    pathname: "/search",
                    params: routeParams(b.rebook!),
                  })
                }
              />
            )}
            <Card>
              <Text style={[styles.heading, { fontSize: 16 }]}>Payment status</Text>
              {b.transactions.length ? (
                b.transactions.map((t) => (
                  <View key={t.id} style={styles.row}>
                    <Text style={styles.body}>
                      {label(t.paymentMethod)} · {label(t.paymentStatus)}
                    </Text>
                    <Text style={[styles.body, { fontWeight: "700" }]}>{money(t.amount)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.small}>
                  No payment transaction recorded.
                </Text>
              )}
            </Card>
            {b.priceSnapshot && (
              <>
                <SectionHeader title="Fare breakdown" icon="receipt" />
                <Fare value={b.priceSnapshot} />
              </>
            )}
            <Card>
              <Text style={[styles.heading, { fontSize: 16 }]}>Booking updates</Text>
              {b.statusHistory.map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="ellipse" size={8} color={theme.brand} />
                  <Text style={[styles.small, { flex: 1 }]}>
                    {label(s.currentStatus)} · {formatDateTime(s.createdAt)}
                  </Text>
                </View>
              ))}
            </Card>
            <Button
              title="Safety & support"
              secondary
              icon="shield-checkmark-outline"
              onPress={() => router.push("/safety")}
            />
            <Button
              title="Get help with this booking"
              secondary
              onPress={() => router.push("/support")}
            />
            <Text style={[styles.small, { textAlign: "center" }]}>
              Contact support for cancellation requests. Eligibility is
              determined under your booking terms.
            </Text>
          </>
        )}
      </SignedIn>
    </Screen>
  );
}
