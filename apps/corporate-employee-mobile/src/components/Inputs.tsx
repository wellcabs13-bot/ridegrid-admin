import { useState } from "react";
import { FlatList, Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, Field, Heading, T, colors, s } from "./ui";

// Picker values are calendar fields, not instants; the server interprets them in India time.
export function DateField({ label, value, onChange, mode = "date" }: { label: string; value: string; onChange: (v: string) => void; mode?: "date" | "time" }) {
  const [open, setOpen] = useState(false);
  const parsed = mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date();
  if (mode === "time" && /^\d{2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    parsed.setHours(h, m);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <View style={{ gap: 8 }}>
      <Field label={label} value={value} onChangeText={onChange} placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:MM"} />
      {Platform.OS !== "web" && <Button title={mode === "date" ? "Choose date" : "Choose time"} secondary onPress={() => setOpen(true)} />}
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
              onChange(mode === "date" ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`);
            }}
          />
          {Platform.OS === "ios" && <Button title="Done" onPress={() => setOpen(false)} />}
        </>
      )}
    </View>
  );
}

export function Select({ label, values, value, onChange, multiple = false }: { label: string; values: string[]; value: string; onChange: (v: string) => void; multiple?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = value.split("|").filter(Boolean);
  return (
    <View style={{ gap: 6 }}>
      <T muted size={13}>{label}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.join(", ") || "Choose"}`}
        disabled={!values.length}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={[s.input, { justifyContent: "center" }, !values.length && { opacity: 0.5 }]}
      >
        <T>{selected.join(", ") || (values.length ? "Choose an option" : "No options available")}</T>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={s.screen}>
          <View style={{ padding: 16, gap: 12 }}>
            <Heading>{label}</Heading>
            <Field label="Search options" value={search} onChangeText={setSearch} />
          </View>
          <FlatList
            data={values.filter((v) => v.toLowerCase().includes(search.toLowerCase()))}
            keyExtractor={(v) => v}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selected.includes(item) }}
                onPress={() => {
                  onChange(multiple ? (selected.includes(item) ? selected.filter((v) => v !== item) : [...selected, item]).join("|") : item);
                  if (!multiple) setOpen(false);
                }}
                style={{ paddingVertical: 16, minHeight: 52, borderBottomWidth: 1, borderColor: colors.border }}
              >
                <T color={selected.includes(item) ? colors.brand : undefined}>{selected.includes(item) ? "Selected: " : ""}{item}</T>
              </Pressable>
            )}
          />
          <View style={{ padding: 16 }}>
            <Button title="Done" onPress={() => setOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
