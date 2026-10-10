import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, Field, Label, s } from "./ui";
import { formatDate, formatTime } from "../utils/when";

// Native calendar/clock picker. Values stay calendar fields in India time:
// "YYYY-MM-DD" (date), "HH:MM" (time) or "YYYY-MM-DDTHH:MM" (datetime), and are
// shown as "05 Oct 2026" / "04:30 PM".
type Mode = "date" | "time" | "datetime";
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function DateField({
  label,
  value,
  onChange,
  mode = "date",
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: Mode;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  const [datePart = "", timePart = ""] =
    mode === "datetime" ? value.split("T") : mode === "date" ? [value] : ["", value];
  // Browsers have no native picker here: keep a typed field on web only.
  if (Platform.OS === "web")
    return (
      <Field
        label={`${label} (${mode === "date" ? "YYYY-MM-DD" : mode === "time" ? "HH:MM" : "YYYY-MM-DDTHH:MM"})`}
        value={value}
        onChangeText={onChange}
      />
    );
  const current = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split("-").map(Number);
    current.setFullYear(y, m - 1, d);
  }
  if (/^\d{2}:\d{2}$/.test(timePart)) {
    const [h, m] = timePart.split(":").map(Number);
    current.setHours(h, m, 0, 0);
  }
  const commit = (part: "date" | "time", d: Date) => {
    if (mode === "date") onChange(ymd(d));
    else if (mode === "time") onChange(hm(d));
    else if (part === "date") {
      onChange(`${ymd(d)}T${timePart || "09:00"}`);
      if (Platform.OS !== "ios") setOpen("time");
    } else onChange(`${datePart || ymd(new Date())}T${hm(d)}`);
  };
  const box = (part: "date" | "time", text: string, placeholder: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${part}: ${text || "not selected"}`}
      onPress={() => setOpen(part)}
      style={[s.input, { flex: 1, justifyContent: "center" }]}
    >
      <Label muted={!text}>{text || placeholder}</Label>
    </Pressable>
  );
  return (
    <View style={{ gap: 6 }}>
      <Label muted>{label}</Label>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {mode !== "time" && box("date", datePart ? formatDate(datePart) : "", "Select date")}
        {mode !== "date" && box("time", timePart ? formatTime(timePart) : "", "Select time")}
      </View>
      {open && (
        <>
          <DateTimePicker
            value={current}
            mode={open}
            themeVariant="dark"
            is24Hour={false}
            minimumDate={open === "date" ? minimumDate : undefined}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, d) => {
              if (Platform.OS !== "ios") setOpen(null);
              if (event.type === "dismissed" || !d) return;
              commit(open, d);
            }}
          />
          {Platform.OS === "ios" && <Button title="Done" onPress={() => setOpen(null)} />}
        </>
      )}
    </View>
  );
}
