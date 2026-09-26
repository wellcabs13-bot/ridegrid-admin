import { useState } from "react";
import { Modal, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Field, styles, theme } from "./ui";
export function Select({
  label,
  values,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = value.split("|").filter(Boolean);
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.small}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.join(", ") || "Choose"}`}
        disabled={!values.length}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={[styles.input, !values.length && { opacity: 0.5 }]}
      >
        <Text style={styles.body}>
          {selected.join(", ") || "Choose an option"}
        </Text>
      </Pressable>
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
