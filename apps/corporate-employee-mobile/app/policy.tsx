import { useQuery } from "@tanstack/react-query";
import { Card, ErrorState, Heading, KeyValue, LoadingState, Screen, T, colors } from "../src/components/ui";
import { BudgetCard } from "../src/components/Corporate";
import { corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Budget, PolicySummary } from "../src/types";
import { label, money } from "../src/utils/journey";

const yes = (v: boolean) => (v ? "Allowed" : "Not allowed");
// PolicyCard: the employee-facing subset of the active company travel policy.
export default function Policy() {
  const { session } = useApp();
  const q = useQuery({ queryKey: ["policy", session?.user.id], queryFn: ({ signal }) => corp<PolicySummary>("policy", "", signal), enabled: !!session });
  const b = useQuery({ queryKey: ["budget", session?.user.id], queryFn: ({ signal }) => corp<Budget>("budget", "", signal), enabled: !!session });
  const p = q.data?.policy;
  return (
    <Screen title="Travel policy" subtitle="Checked by RideGrid on every search and booking." refresh={() => { void q.refetch(); void b.refetch(); }} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {q.data && (
        <>
          <Card tone={colors.blue}>
            <Heading>{p ? p.name : "No active company policy"}</Heading>
            {p ? (
              <>
                <KeyValue k="Maximum per trip" v={p.maxTripAmount ? money(p.maxTripAmount) : "No fixed limit"} />
                <KeyValue k="Vehicle categories" v={p.allowedCategories.length ? p.allowedCategories.map(label).join(", ") : "Any category"} />
                <KeyValue k="Book in advance" v={p.advanceBookingHours ? `At least ${p.advanceBookingHours} hour(s)` : "No minimum"} />
                <KeyValue k="Outstation travel" v={yes(p.outstationAllowed)} />
                <KeyValue k="Night travel (10 PM to 6 AM)" v={p.nightTravelAllowed ? "Allowed" : "Needs approval"} />
                <KeyValue k="Every trip needs approval" v={p.approvalRequired ? "Yes" : "No"} />
              </>
            ) : (
              <T muted>Your company has not published a travel policy. Rides are checked against your personal travel limits only.</T>
            )}
          </Card>
          <Card>
            <Heading>How decisions work</Heading>
            <T size={14}><T color={colors.emerald} weight="700">Within policy</T>: book immediately.</T>
            <T size={14}><T color={colors.amber} weight="700">Approval required</T>: over a limit or outside a rule. Submit it, and book at a fresh price once approved.</T>
            <T size={14}><T color={colors.red} weight="700">Not allowed</T>: prohibited by policy (for example outstation travel when disallowed, or too short notice). These cannot be approved.</T>
          </Card>
          {!!q.data.approvalStages.length && (
            <Card>
              <Heading>Approval chain</Heading>
              {q.data.approvalStages.map((s) => (
                <KeyValue key={s.level} k={`Level ${s.level}`} v={`${s.approver}${s.maxAmount != null ? ` · up to ${money(s.maxAmount)}` : ""}`} />
              ))}
            </Card>
          )}
          {b.data && <BudgetCard budget={b.data} />}
          {b.data && !b.data.visible && <Card><T muted size={13}>Your company has not set personal travel limits for you.</T></Card>}
        </>
      )}
    </Screen>
  );
}
