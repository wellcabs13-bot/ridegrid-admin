import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ErrorText } from "./ui";
import { useApp } from "../state/Providers";
import { post } from "../services/api";
import type { RouteDraft } from "../types";
export function SaveRoute({ search }: { search: RouteDraft }) {
  const { session, online } = useApp();
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      post("/api/mobile/routes", {
        serviceType: search.serviceType,
        tripType: search.tripType,
        pickupCity: search.pickupCity,
        dropCity: search.dropCity,
        category: search.category,
        packageName: search.packageName,
      }),
    onSuccess: () => {
      setSaved(true);
      void client.invalidateQueries({ queryKey: ["saved-routes"] });
    },
  });
  if (!session) return null;
  return (
    <>
      <Button
        secondary
        title={saved ? "Route saved" : "Save this route"}
        disabled={!online || saved}
        busy={save.isPending}
        onPress={() => save.mutate()}
      />
      <ErrorText error={save.error} />
    </>
  );
}
