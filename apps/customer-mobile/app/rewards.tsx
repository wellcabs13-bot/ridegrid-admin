import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Screen,
  Card,
  SignedIn,
  Loading,
  ErrorText,
  Empty,
  styles,
  Button,
} from "../src/components/ui";
import { Badge } from "../src/components/Premium";
import { useApp } from "../src/state/Providers";
import { api } from "../src/services/api";
export default function Rewards() {
  const { session } = useApp();
  const q = useQuery({
    queryKey: ["rewards", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) =>
      api<{
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
      }>("/api/mobile/rewards", { signal }),
  });
  return (
    <Screen title="Loyalty rewards" subtitle="Your recorded RideGrid points.">
      <SignedIn>
        {q.isPending && <Loading />}
        <ErrorText error={q.error} />
        {q.isError && (
          <Button title="Retry rewards" onPress={() => void q.refetch()} />
        )}
        {q.data && !q.data.account && (
          <Empty
            title="No rewards account yet"
            body="If points are awarded to your account, they will appear here."
          />
        )}
        {q.data?.account && (
          <>
            <Card>
              <Badge text="LOYALTY" tone="gold" />
              <Text style={styles.title}>
                {q.data.account.totalPoints.toLocaleString("en-IN")} points
              </Text>
              <Text style={styles.small}>
                Points are not cash. Redemption is not available in this app.
              </Text>
            </Card>
            {q.data.account.transactions.map((t) => (
              <Card key={t.id}>
                <Text style={styles.heading}>
                  {t.points} points · {t.transactionType}
                </Text>
                <Text style={styles.body}>{t.description}</Text>
                <Text style={styles.small}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </Text>
              </Card>
            ))}
          </>
        )}
      </SignedIn>
    </Screen>
  );
}
