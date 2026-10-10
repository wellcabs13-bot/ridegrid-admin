import { useState } from "react";
import { Modal, FlatList, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Field, styles, theme } from "./ui";
// Icon field row shared by every "pick one" input: tinted icon, small caption,
// bold value, chevron. JourneyDate renders the same row for dates and times.
export function FieldBox({
  label,
  value,
  placeholder,
  icon,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 58,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.line,
          backgroundColor: theme.surface,
        },
        disabled && { opacity: 0.5 },
        pressed && { backgroundColor: theme.field },
      ]}
    >
      {icon && <Ionicons name={icon} size={20} color={theme.brand} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: 11.5, color: theme.muted, fontWeight: "500" }}>{label}</Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: value ? "700" : "500",
            color: value ? theme.ink : "#9AA1AE",
          }}
        >
          {value || placeholder}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={16} color="#A3A9B5" />
    </Pressable>
  );
}
export function Select({
  label,
  values,
  value,
  onChange,
  multiple = false,
  icon,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
  multiple?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = value.split("|").filter(Boolean);
  return (
    <View>
      <FieldBox
        label={label}
        icon={icon}
        value={selected.join(", ")}
        placeholder="Choose an option"
        accessibilityLabel={`${label}: ${selected.join(", ") || "Choose"}`}
        disabled={!values.length}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.screen}>
          <View style={styles.content}>
            <Text style={styles.heading}>{label}</Text>
            <Field
              label="Search options"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <FlatList
            data={values.filter((v) =>
              v.toLowerCase().includes(search.toLowerCase()),
            )}
            keyExtractor={(v) => v}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selected.includes(item) }}
                onPress={() => {
                  onChange(
                    multiple
                      ? (selected.includes(item)
                          ? selected.filter((v) => v !== item)
                          : [...selected, item]
                        ).join("|")
                      : item,
                  );
                  if (!multiple) setOpen(false);
                }}
                style={{
                  padding: 18,
                  minHeight: 56,
                  borderBottomWidth: 1,
                  borderColor: theme.line,
                }}
              >
                <Text style={styles.body}>
                  {selected.includes(item) ? "Selected / " : ""}
                  {item}
                </Text>
              </Pressable>
            )}
          />
          <View style={{ padding: 20 }}>
            <Button title="Done" onPress={() => setOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
