import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, Field, styles } from "./ui";
import { formatDate, formatTime } from "../utils/when";
// Treat picker values as calendar fields, not instants. The quote boundary converts
// the chosen fields to Asia/Kolkata; a device timezone never changes the trip day.
// The value stays "YYYY-MM-DD" / "HH:MM"; it is shown as "05 Oct 2026" / "04:30 PM".
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
  // Browsers have no native picker here: keep a typed field on web only.
  if (Platform.OS === "web")
    return (
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:MM"}
      />
    );
  const shown = value ? (mode === "date" ? formatDate(value) : formatTime(value)) : "";
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.small}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown || "not selected"}`}
        onPress={() => setOpen(true)}
        style={[styles.input, { justifyContent: "center" }]}
      >
        <Text style={[styles.body, !shown && { opacity: 0.6 }]}>
          {shown || (mode === "date" ? "Select date" : "Select time")}
        </Text>
      </Pressable>
      {open && (
        <>
          <DateTimePicker
            value={Number.isFinite(parsed.getTime()) ? parsed : new Date()}
            mode={mode}
            themeVariant="light"
            is24Hour={false}
            minimumDate={mode === "date" ? new Date() : undefined}
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
