import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, Field } from "./ui";
// Treat picker values as calendar fields, not instants. The quote boundary converts
// the chosen fields to Asia/Kolkata; a device timezone never changes the trip day.
export function JourneyDate({
  label,
  value,
  onChange,
  mode = "date",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: "date" | "time";
}) {
  const [open, setOpen] = useState(false);
  const parsed =
    mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date();
  if (mode === "time" && /^\d{2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    parsed.setHours(h, m);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:MM"}
      />
      {Platform.OS !== "web" && (
        <Button
          title={mode === "date" ? "Choose date" : "Choose time"}
          secondary
          onPress={() => setOpen(true)}
        />
      )}
      {open && Platform.OS !== "web" && (
        <>
          <DateTimePicker
            value={Number.isFinite(parsed.getTime()) ? parsed : new Date()}
            mode={mode}
            themeVariant="dark"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              if (Platform.OS !== "ios") setOpen(false);
              if (event.type === "dismissed" || !date) return;
              onChange(
                mode === "date"
                  ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
                  : `${pad(date.getHours())}:${pad(date.getMinutes())}`,
              );
            }}
          />
          {Platform.OS === "ios" && (
            <Button title="Done" onPress={() => setOpen(false)} />
          )}
        </>
      )}
    </View>
  );
}
