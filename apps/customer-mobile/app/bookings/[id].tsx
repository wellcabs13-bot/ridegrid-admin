import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDateTime } from "../../src/utils/when";
import { TripStatus } from "../../src/components/TripStatus";
import { Badge, PriceDisplay } from "../../src/components/Premium";
import { routeParams, shareSummary } from "../../src/utils/routes";
import { Linking, Text, Share } from "react-native";
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
  return (
    <Screen
      title={
        confirmed && b?.status === "CONFIRMED"
          ? "Booking confirmed!"
          : confirmed
            ? "Booking received"
            : "Your booking"
      }
      subtitle={b?.bookingNumber}
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
              {confirmed && b.status === "CONFIRMED" && (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={64}
                  color={theme.success}
                  style={{ alignSelf: "center" }}
                />
              )}
              <Badge
                text={bookingStatusLabel(b.status)}
                tone={bookingTone(b.status).tone}
                icon={bookingTone(b.status).icon}
              />
              <Text style={styles.body}>{b.pickupLocation}</Text>
              <Text style={styles.small}>to</Text>
              <Text style={styles.body}>{b.dropLocation}</Text>
              <Text style={styles.small}>
                {formatDateTime(b.pickupDateTime)}{" "}
                IST
              </Text>
              <Text style={styles.small}>
                {label(b.tripType)} / {b.tripDays} day(s)
              </Text>
              <PriceDisplay value={b.finalFare ?? b.estimatedFare} />
            </Card>
            <Card>
              <Text style={styles.heading}>Your ride</Text>
              <Text style={styles.body}>
                {b.vehicle.make} {b.vehicle.model} /{" "}
                {b.vehicle.registrationNumber}
              </Text>
              <Text style={styles.small}>{b.vendor.companyName}</Text>
              {b.driver ? (
                <>
                  <Text style={styles.body}>
                    Driver: {b.driver.firstName} {b.driver.lastName}
                  </Text>
                  {b.driver.user.mobile && (
                    <Button
                      title="Call driver"
                      secondary
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
            <Button
              title="Share trip"
              secondary
              onPress={() => {
                void Share.share({ message: shareSummary(b) }).catch(() => {});
              }}
            />
            {b.rebook && (
              <Button
                title="Quick rebook"
                onPress={() =>
                  router.push({
                    pathname: "/search",
                    params: routeParams(b.rebook!),
                  })
                }
              />
            )}
            <Button
              title="View My Trips"
              secondary
              onPress={() => router.push("/(tabs)/trips")}
            />
            <Button
              title="Safety & support"
              secondary
              onPress={() => router.push("/safety")}
            />
            <Card>
              <Text style={styles.heading}>Payment status</Text>
              {b.transactions.length ? (
                b.transactions.map((t) => (
                  <Text key={t.id} style={styles.body}>
                    {label(t.paymentMethod)} / {label(t.paymentStatus)} /{" "}
                    {money(t.amount)}
                  </Text>
                ))
              ) : (
                <Text style={styles.small}>
                  No payment transaction recorded.
                </Text>
              )}
            </Card>
            {b.priceSnapshot && <Fare value={b.priceSnapshot} />}
            <Card>
              <Text style={styles.heading}>Booking updates</Text>
              {b.statusHistory.map((s, i) => (
                <Text key={i} style={styles.small}>
                  {label(s.currentStatus)} /{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </Text>
              ))}
            </Card>
            <Button
              title="Get help with this booking"
              secondary
              onPress={() => router.push("/support")}
            />
            <Text style={styles.small}>
              Contact support for cancellation requests. Eligibility is
              determined under your booking terms.
            </Text>
          </>
        )}
      </SignedIn>
    </Screen>
  );
}
