import { useState } from "react";
import { Button, Label, LinkButton, Screen } from "../components/ui";
import { logout } from "../state/Providers";
export default function More() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Screen title="Business centre">
      {[
        ["Availability", "/availability"],
        ["Vendor pricing", "/pricing"],
        ["Earnings & settlements", "/earnings"],
        ["Notifications", "/notifications"],
        ["Profile & documents", "/profile"],
        ["Operations support", "/support"],
      ].map(([title, href]) => (
        <LinkButton key={href} title={title} href={href} />
      ))}
      {!!error && <Label>{error}</Label>}
      <Button
        title="Sign out"
        danger
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await logout();
          } catch {
            setError("Unable to sign out on the server. Reconnect and retry.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
