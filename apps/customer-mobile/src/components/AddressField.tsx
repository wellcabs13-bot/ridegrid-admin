import { useState } from "react";
import { Text } from "react-native";
import { api } from "../services/api";
import { Button, Field, ErrorText, styles } from "./ui";
export function AddressField({
  label,
  value,
  onChange,
  online,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  online: boolean;
}) {
  const [results, setResults] = useState<
    { placeId: string; displayName: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search() {
    setBusy(true);
    setError("");
    try {
      setResults(
        await api(
          `/api/marketplace/location-search?q=${encodeURIComponent(value)}`,
          {},
          false,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Field
        label={label}
        value={value}
        onChangeText={(v) => {
          onChange(v);
          setResults([]);
        }}
        multiline
      />
      <Button
        title={`Find ${label.toLowerCase()}`}
        secondary
        disabled={!online || value.trim().length < 3}
        busy={busy}
        onPress={() => void search()}
      />
      <Text style={styles.small}>
        Enter a full address manually, or search and select a suggestion.
      </Text>
      <ErrorText error={error} />
      {results.map((r) => (
        <Button
          key={r.placeId}
          title={r.displayName}
          secondary
          onPress={() => {
            onChange(r.displayName);
            setResults([]);
          }}
        />
      ))}
    </>
  );
}
