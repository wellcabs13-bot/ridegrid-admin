import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, baseURL, post } from "../src/services/api";
import { Screen, Card, Button, ErrorText, Empty, styles } from "../src/components/ui";
import { money } from "../src/utils/journey";

type StatusData = {
  bookingId: string;
  bookingNumber: string;
  status: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "FAILED" | "REFUNDED" | null;
  amount: number | null;
};

const POLL_MS = 3000;
const MAX_POLLS = 40;

export default function PaymentReturn() {
  const params = useLocalSearchParams<{ bookingId?: string; bookingNumber?: string }>();
  const bookingId = params.bookingId || "";
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pollCount = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (!bookingId) return;
    try {
      const result = await api<StatusData>(
        `/api/payments/status?bookingId=${encodeURIComponent(bookingId)}`,
      );
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [bookingId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    // Stop once payment or the booking itself is final (a cancelled hold never revives).
    if (!data || data.paymentStatus === "PAID" || data.paymentStatus === "FAILED" || data.status === "CANCELLED") return;
    const id = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        setExpired(true);
        clearInterval(id);
        return;
      }
      void fetchStatus();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [data, fetchStatus]);

  async function retry() {
    if (!bookingId) return;
    try {
      setRetrying(true);
      setError("");
      const result = await post<{ payuCheckoutUrl?: string }>("/api/payments/payu/retry", {
        bookingId,
        platform: "mobile",
      });
      if (!result.payuCheckoutUrl) throw new Error("Unable to retry payment.");
      const opened = await WebBrowser.openAuthSessionAsync(
        `${baseURL}${result.payuCheckoutUrl}`,
        "ridegrid://payment-return",
      );
      if (opened.type === "success") {
        pollCount.current = 0;
        setExpired(false);
      }
      void fetchStatus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  if (!bookingId) {
    return (
      <Screen title="Payment status">
        <Empty title="No booking reference" body="Open My Trips to find your booking." />
        <Button title="Open My Trips" onPress={() => router.replace("/(tabs)/trips")} />
      </Screen>
    );
  }

  // Confirmed only when the server has both captured the payment and kept the booking.
  // A payment captured after the hold expired leaves the booking cancelled: refund due.
  const cancelled = data?.status === "CANCELLED";
  const paid = data?.paymentStatus === "PAID" && !cancelled;
  const refundDue = data?.paymentStatus === "PAID" && cancelled;
  const failed = !paid && !refundDue && (data?.paymentStatus === "FAILED" || cancelled);
  const processing = !paid && !failed && !refundDue && !expired;

  return (
    <Screen title="Payment status" subtitle="Your booking is the source of truth for payment status.">
      <Card>
        {processing && (
          <View style={{ alignItems: "center", padding: 12 }}>
            <ActivityIndicator size="large" />
            <Text style={[styles.heading, { marginTop: 12 }]}>Processing payment...</Text>
          </View>
        )}
        {paid && <Text style={styles.heading}>Booking confirmed and paid.</Text>}
        {refundDue && (
          <>
            <Text style={styles.heading}>Payment received, booking not confirmed.</Text>
            <Text style={styles.body}>
              Your payment arrived after the vehicle hold expired, so this booking was not confirmed. A full refund is being arranged. Contact support with your booking number if you have questions.
            </Text>
          </>
        )}
        {expired && !paid && !refundDue && !failed && <Text style={styles.heading}>We did not receive a confirmation in time.</Text>}
        {failed && (
          <>
            <Text style={styles.heading}>{cancelled ? "Booking not confirmed." : "Payment failed."}</Text>
            <Text style={styles.body}>
              {cancelled ? "The payment was not completed before the vehicle hold ended, and the vehicle was released. If any amount was deducted, RideGrid refunds it; contact support with your booking number. Search again to book." : "You can retry the payment while the vehicle hold lasts."}
            </Text>
          </>
        )}
        {data && (
          <>
            <Text style={styles.small}>Booking {data.bookingNumber}</Text>
            {data.amount != null && <Text style={styles.small}>Amount {money(data.amount)}</Text>}
          </>
        )}
        <ErrorText error={error} />
        {((failed && !cancelled) || (expired && !failed && !refundDue)) && !paid && (
          <Button title="Retry payment" busy={retrying} onPress={() => void retry()} />
        )}
        {refundDue && (
          <Button title="Contact support" secondary onPress={() => router.push("/support")} />
        )}
        <Button
          title="Open My Trips"
          secondary
          onPress={() => router.replace("/(tabs)/trips")}
        />
      </Card>
    </Screen>
  );
}
