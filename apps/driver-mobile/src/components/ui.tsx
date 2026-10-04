import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../state/Providers";
import { formatDateTime, istParts } from "../utils/when";
import { statusInfo, type Tone } from "../utils/trips";
import type { Booking, DriverName, Vehicle } from "../types";

// Driver app design system: white surfaces, red for the primary action, green for
// "go"/success moments, blue only for upcoming states and links.
export const colors = {
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#ECEDF1",
  text: "#15171C",
  muted: "#6B7080",
  faint: "#A3A7B3",
  brand: "#E53935",
  brandDark: "#C62828",
  brandSoft: "#FDECEC",
  green: "#1F9D55",
  greenDark: "#17824A",
  greenSoft: "#E6F6EC",
  blue: "#2F6FED",
  blueSoft: "#EAF1FE",
  amber: "#B26A00",
  amberSoft: "#FFF3DC",
  grey: "#5D6270",
  greySoft: "#EFF0F3",
};
const tones: Record<Tone, { fg: string; bg: string }> = {
  red: { fg: colors.brand, bg: colors.brandSoft },
  green: { fg: colors.green, bg: colors.greenSoft },
  blue: { fg: colors.blue, bg: colors.blueSoft },
  amber: { fg: colors.amber, bg: colors.amberSoft },
  grey: { fg: colors.grey, bg: colors.greySoft },
};
type Icon = React.ComponentProps<typeof Ionicons>["name"];

export function Label({
  children,
  muted = false,
  large = false,
  bold = false,
  small = false,
  center = false,
  color,
}: React.PropsWithChildren<{ muted?: boolean; large?: boolean; bold?: boolean; small?: boolean; center?: boolean; color?: string }>) {
  return (
    <Text
      style={{
        color: color || (muted ? colors.muted : colors.text),
        fontSize: large ? 22 : small ? 13 : 15,
        fontWeight: large ? "800" : bold ? "700" : "400",
        lineHeight: large ? 28 : small ? 18 : 21,
        textAlign: center ? "center" : "left",
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}

const TAB_ROOTS = ["/", "/trips", "/earnings", "/more", "/login"];
// Every screen: optional back chevron with a centred title (or a custom header),
// scrolling body, and an optional fixed footer holding the screen's one primary action.
export function Screen({
  title,
  children,
  refresh,
  refreshing = false,
  scroll = true,
  header,
  footer,
  right,
}: React.PropsWithChildren<{
  title?: string;
  refresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  right?: React.ReactNode;
}>) {
  const { online } = useApp();
  const pathname = usePathname();
  const back = !TAB_ROOTS.includes(pathname);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {header ?? (
          <View style={s.header}>
            <View style={s.headerSide}>
              {back && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  hitSlop={10}
                  style={s.iconButton}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>
              )}
            </View>
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
            <View style={[s.headerSide, { alignItems: "flex-end" }]}>{right}</View>
          </View>
        )}
        {!online && (
          <View style={s.offline}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.amber} />
            <Text style={{ color: colors.amber, fontWeight: "600", flex: 1 }}>Offline · showing last received data. Reconnect to save.</Text>
          </View>
        )}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.body}
            refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  if (onPress)
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

type Variant = "primary" | "success" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand, fg: "#FFFFFF" },
  success: { bg: colors.green, fg: "#FFFFFF" },
  danger: { bg: colors.brandDark, fg: "#FFFFFF" },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: "transparent", fg: colors.brand },
};
export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  icon,
  busy,
  compact,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  icon?: Icon;
  busy?: boolean;
  compact?: boolean;
}) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.button,
        compact && { minHeight: 48 },
        { backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={20} color={v.fg} /> : null}
      <Text style={[s.buttonText, { color: v.fg }, compact && { fontSize: 15 }]}>{title}</Text>
    </Pressable>
  );
}

// The screen's single, obvious next step, pinned above the home indicator.
export function BottomCTA({ note, ...button }: React.ComponentProps<typeof Button> & { note?: string }) {
  return (
    <SafeAreaView edges={["bottom"]} style={s.footer}>
      {!!note && <Text style={s.footerNote}>{note}</Text>}
      <Button {...button} />
    </SafeAreaView>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  secret = false,
  icon,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secret?: boolean;
  icon?: Icon;
  keyboardType?: "default" | "email-address";
}) {
  const [shown, setShown] = React.useState(false);
  return (
    <View style={s.input}>
      {icon && <Ionicons name={icon} size={20} color={colors.muted} />}
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secret && !shown}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholderTextColor={colors.faint}
        style={s.inputText}
      />
      {secret && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown ? "Hide password" : "Show password"}
          onPress={() => setShown((v) => !v)}
          hitSlop={8}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function Pills({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[s.pill, on ? { backgroundColor: colors.brand, borderColor: colors.brand } : null]}
          >
            <Text style={{ color: on ? "#FFFFFF" : colors.text, fontWeight: "700", fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Badge({ label, tone = "grey" }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
export function StatusBadge({ booking }: { booking: Pick<Booking, "status" | "trip"> }) {
  const info = statusInfo(booking);
  return <Badge label={info.label} tone={info.tone} />;
}
// Generic record status (documents, payroll, account): words, not raw enum codes.
export function RecordBadge({ value }: { value: string }) {
  const tone: Tone = /CANCEL|REJECT|EXPIRE|SUSPEND|BLOCK|FAIL/.test(value)
    ? "red"
    : /PENDING|MAINTENANCE|RESERV|INACTIVE|SOON|PROCESS/.test(value)
      ? "amber"
      : /AVAILABLE|ACTIVE|APPROVED|COMPLETED|SETTLED|VERIFIED|PAID/.test(value)
        ? "green"
        : "blue";
  const label = value.replaceAll("_", " ").toLowerCase();
  return <Badge label={label.charAt(0).toUpperCase() + label.slice(1)} tone={tone} />;
}

export function StatTiles({ items, tinted = false }: { items: { label: string; value: string; icon?: Icon; tone?: Tone }[]; tinted?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: tinted ? 10 : 0 }}>
      {items.map((it, i) => {
        const t = tones[it.tone || "grey"];
        return (
          <View
            key={it.label}
            style={[
              s.tile,
              tinted ? { backgroundColor: t.bg, borderRadius: 14 } : i > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.border } : null,
            ]}
          >
            {it.icon && <Ionicons name={it.icon} size={22} color={t.fg} />}
            <Text style={[s.tileValue, tinted && { color: t.fg }]} numberOfLines={1} adjustsFontSizeToFit>
              {it.value}
            </Text>
            <Text style={s.tileLabel}>{it.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Pin({ color }: { color: string }) {
  return <Ionicons name="location" size={22} color={color} />;
}
// Pickup (red pin) → drop (green pin), optional "Open Map" tile on the right.
export function RouteBlock({ pickup, drop, onOpenMap, compact = false }: { pickup: string; drop: string; onOpenMap?: () => void; compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <View style={s.routeRow}>
          <Pin color={colors.brand} />
          <View style={{ flex: 1 }}>
            {!compact && <Text style={s.routeCaption}>Pickup</Text>}
            <Text style={s.routePlace} numberOfLines={compact ? 2 : 3}>{pickup}</Text>
          </View>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <Pin color={colors.green} />
          <View style={{ flex: 1 }}>
            {!compact && <Text style={s.routeCaption}>Drop</Text>}
            <Text style={s.routePlace} numberOfLines={compact ? 2 : 3}>{drop}</Text>
          </View>
        </View>
      </View>
      {onOpenMap && (
        <Pressable accessibilityRole="button" accessibilityLabel="Open route in Maps" onPress={onOpenMap} style={s.mapTile}>
          <Ionicons name="map" size={26} color={colors.blue} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>Open Map</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Avatar({ name: who, size = 48 }: { name: string; size?: number }) {
  const initials = who.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.brand, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

function RoundAction({ icon, label, color, bg, onPress }: { icon: Icon; label: string; color: string; bg: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: "center", gap: 4, minWidth: 56 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
// Customer with the two contact actions the platform supports: phone call (only
// while the assignment is operational) and RideGrid support for this trip.
export function CustomerCard({ name: who, caption, onCall, onSupport }: { name: string; caption?: string; onCall?: () => void; onSupport?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Avatar name={who} />
      <View style={{ flex: 1 }}>
        <Label bold>{who}</Label>
        {!!caption && <Label small muted>{caption}</Label>}
      </View>
      {onCall && <RoundAction icon="call" label="Call" color={colors.brand} bg={colors.brandSoft} onPress={onCall} />}
      {onSupport && <RoundAction icon="headset" label="Support" color={colors.green} bg={colors.greenSoft} onPress={onSupport} />}
    </View>
  );
}

export function VehicleRow({ vehicle: v, onPress }: { vehicle: Vehicle; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={[s.iconBox, { width: 56, height: 56 }]}>
        <Ionicons name="car-sport" size={30} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Label bold>{v.make} {v.model}</Label>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, letterSpacing: 0.5 }}>{v.registrationNumber}</Text>
        <Label small muted>{[v.category, v.fuelType, v.transmission].filter(Boolean).map((x) => x.replaceAll("_", " ").toLowerCase()).join(" • ")}</Label>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.faint} />}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  tone = "grey",
  last = false,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  tone?: Tone;
  last?: boolean;
}) {
  const t = tones[tone];
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [s.listRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.iconBox, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={20} color={tone === "grey" ? colors.text : t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: tone === "red" ? colors.brand : colors.text }}>{title}</Text>
        {!!subtitle && <Label small muted>{subtitle}</Label>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.faint} />}
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{title}</Text>
      {action && onAction && (
        <Pressable accessibilityRole="link" hitSlop={10} onPress={onAction}>
          <Text style={{ color: colors.blue, fontWeight: "700" }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Notice({ icon = "information-circle-outline", text, tone = "amber", onPress }: { icon?: Icon; text: string; tone?: Tone; onPress?: () => void }) {
  const t = tones[tone];
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: t.bg, borderRadius: 14, padding: 14 }}>
      <Ionicons name={icon} size={24} color={t.fg} />
      <Text style={{ flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 }}>{text}</Text>
      {onPress && <Ionicons name="chevron-forward" size={18} color={t.fg} />}
    </Pressable>
  );
}

// Loading skeleton, error with retry, or empty state — whichever applies.
export function StateView({
  loading,
  error,
  empty,
  retry,
  emptyTitle = "Nothing here yet",
  emptyText = "New activity will appear here when available.",
  emptyIcon = "file-tray-outline",
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  retry?: () => void;
  emptyTitle?: string;
  emptyText?: string;
  emptyIcon?: Icon;
}) {
  if (loading)
    return (
      <View style={{ gap: 12 }} accessibilityLabel="Loading">
        <ActivityIndicator color={colors.brand} />
        <View style={[s.card, { height: 96, opacity: 0.8 }]} />
        <View style={[s.card, { height: 96, opacity: 0.45 }]} />
      </View>
    );
  if (error)
    return (
      <View style={s.state}>
        <View style={[s.stateIcon, { backgroundColor: colors.brandSoft }]}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.brand} />
        </View>
        <Label bold center>Couldn’t load this</Label>
        <Label muted center>{error.message}</Label>
        {retry && <Button title="Try again" icon="refresh" variant="secondary" compact onPress={retry} />}
      </View>
    );
  if (empty)
    return (
      <View style={s.state}>
        <View style={s.stateIcon}>
          <Ionicons name={emptyIcon} size={30} color={colors.muted} />
        </View>
        <Label bold center>{emptyTitle}</Label>
        <Label muted center>{emptyText}</Label>
      </View>
    );
  return null;
}

export function TripCard({ booking: b }: { booking: Booking }) {
  const when = istParts(b.pickupDateTime);
  return (
    <Card onPress={() => router.push({ pathname: "/trip", params: { id: b.id } })}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, flexShrink: 1 }}>
          {when ? `${when.date}, ${when.time}` : "Time not recorded"}
        </Text>
        <StatusBadge booking={b} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} compact />
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.faint} />
      </View>
      <Label small muted>
        {b.bookingNumber} · {b.vehicle?.registrationNumber} · {(b.pricingPackage?.packageType || b.tripType).replaceAll("_", " ").toLowerCase()}
      </Label>
    </Card>
  );
}

export const name = (d: DriverName | null | undefined) => (d ? `${d.firstName} ${d.lastName}` : "Unassigned");
export const money = (v: string | number | null | undefined) =>
  v == null ? "Not recorded" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const dateTime = (v: string | null | undefined) => (v ? `${formatDateTime(v)} IST` : "Not recorded");

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerSide: { width: 56 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.text },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  offline: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.amberSoft, paddingHorizontal: 16, paddingVertical: 10 },
  body: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  button: { minHeight: 58, borderRadius: 14, paddingHorizontal: 18, flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center" },
  buttonText: { fontWeight: "800", textAlign: "center", fontSize: 18 },
  footer: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  footerNote: { color: colors.muted, fontSize: 13, textAlign: "center" },
  input: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surface, minHeight: 56 },
  inputText: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  pill: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 18, minHeight: 42, justifyContent: "center" },
  tile: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, paddingHorizontal: 4 },
  tileValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  tileLabel: { fontSize: 12, color: colors.muted, fontWeight: "600", textAlign: "center" },
  routeRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  routeLine: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 10, marginVertical: 2 },
  routeCaption: { fontSize: 11, color: colors.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  routePlace: { fontSize: 16, fontWeight: "700", color: colors.text, lineHeight: 21 },
  mapTile: { width: 84, height: 84, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", gap: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greySoft, alignItems: "center", justifyContent: "center" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 60 },
  state: { alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 16 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
});
