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
    if (!data || data.paymentStatus === "PAID" || data.paymentStatus === "FAILED") return;
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

  const paid = data?.paymentStatus === "PAID";
  const failed = data?.paymentStatus === "FAILED";
  const processing = !paid && !failed && !expired;

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
        {expired && !paid && <Text style={styles.heading}>We did not receive a confirmation in time.</Text>}
        {failed && !expired && <Text style={styles.heading}>Payment failed.</Text>}
        {data && (
          <>
            <Text style={styles.small}>Booking {data.bookingNumber}</Text>
            {data.amount != null && <Text style={styles.small}>Amount {money(data.amount)}</Text>}
          </>
        )}
        <ErrorText error={error} />
        {(failed || expired) && !paid && (
          <Button title="Retry payment" busy={retrying} onPress={() => void retry()} />
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
