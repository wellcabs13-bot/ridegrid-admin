import React from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
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
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../state/Providers";
import { formatDateTime, istParts } from "../utils/when";
import { statusInfo, type Tone } from "../utils/trips";
import type { Booking, DriverName, Vehicle } from "../types";

// Driver app design system: bright white base, RideGrid red for the primary action,
// deep charcoal text, green for go/success/verified, blue only for upcoming/navigation.
export const colors = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#ECEDF2",
  text: "#14161B",
  muted: "#666B7A",
  faint: "#A2A6B2",
  brand: "#E53935",
  brandDark: "#C62828",
  brandDeep: "#B71C1C",
  brandSoft: "#FDECEC",
  brandTint: "#FFF5F5",
  green: "#1F9D55",
  greenDark: "#157A42",
  greenSoft: "#E6F6EC",
  blue: "#2F6FED",
  blueSoft: "#EAF1FE",
  amber: "#B26A00",
  amberSoft: "#FFF3DC",
  grey: "#5D6270",
  greySoft: "#F0F1F5",
};
export const gradients = {
  brand: ["#F04B45", "#D32F2F"] as const,
  success: ["#26B160", "#178A48"] as const,
  dark: ["#C62828", "#8E1B1B"] as const,
  blush: ["#FFF1F1", "#FFFFFF"] as const,
  mint: ["#ECFAF1", "#FFFFFF"] as const,
  hero: ["#FFE7E6", "#FFF6F2", "#FFFFFF"] as const,
  border: ["#F26B66", "#FFC7C4", "#7DD3A5"] as const,
  nav: ["#1E9A55", "#11703C"] as const,
};
export const tones: Record<Tone, { fg: string; bg: string }> = {
  red: { fg: colors.brand, bg: colors.brandSoft },
  green: { fg: colors.green, bg: colors.greenSoft },
  blue: { fg: colors.blue, bg: colors.blueSoft },
  amber: { fg: colors.amber, bg: colors.amberSoft },
  grey: { fg: colors.grey, bg: colors.greySoft },
};
export const shadow = Platform.select<ViewStyle>({
  android: { elevation: 3, shadowColor: "#1A1D29" },
  default: { shadowColor: "#1A1D29", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
});
const shadowStrong = Platform.select<ViewStyle>({
  android: { elevation: 8, shadowColor: colors.brand },
  default: { shadowColor: colors.brand, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
});
export type Icon = React.ComponentProps<typeof Ionicons>["name"];

// ---- Motion: subtle, and off when the OS asks for reduced motion. ----
let reduced = false;
void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduced = v)).catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => (reduced = v));
export function useReducedMotion() {
  const [value, set] = React.useState(reduced);
  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(set).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", set);
    return () => sub.remove();
  }, []);
  return value;
}
// Press feedback: a gentle scale-down on touch.
function usePressScale(to = 0.97) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const go = (v: number) => () => {
    if (reduced) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  return { style: { transform: [{ scale }] }, onPressIn: go(to), onPressOut: go(1) };
}
// Small fade + slide-up when a section first appears.
export function FadeIn({ children, delay = 0, style }: React.PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const v = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  React.useEffect(() => {
    if (reduced) return;
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>{children}</Animated.View>;
}
// Slow breathing glow behind the next-action card.
export function Pulse({ children, active = true, color = colors.brand, radius = 24 }: React.PropsWithChildren<{ active?: boolean; color?: string; radius?: number }>) {
  const still = useReducedMotion();
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!active || still) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, still, v]);
  return (
    <View>
      {active && !still && (
        <Animated.View
          pointerEvents="none"
          style={{ ...StyleSheet.absoluteFillObject, borderRadius: radius, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }}
        />
      )}
      {children}
    </View>
  );
}

export function Label({
  children,
  muted = false,
  large = false,
  bold = false,
  small = false,
  center = false,
  color,
  lines,
}: React.PropsWithChildren<{ muted?: boolean; large?: boolean; bold?: boolean; small?: boolean; center?: boolean; color?: string; lines?: number }>) {
  return (
    <Text
      numberOfLines={lines}
      style={{
        color: color || (muted ? colors.muted : colors.text),
        fontSize: large ? 22 : small ? 13.5 : 15,
        fontWeight: large ? "800" : bold ? "700" : "400",
        lineHeight: large ? 28 : small ? 19 : 21,
        textAlign: center ? "center" : "left",
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}

const TAB_ROOTS = ["/", "/trips", "/earnings", "/more", "/login"];
// Every screen: back chevron with centred title (or a custom header), scrolling body,
// and an optional fixed footer holding the screen's one primary action.
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {header ?? (
          <View style={s.header}>
            <View style={s.headerSide}>
              {back && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  hitSlop={10}
                  style={({ pressed }) => [s.iconButton, pressed && { backgroundColor: colors.greySoft }]}
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
            <Ionicons name="cloud-offline-outline" size={18} color={colors.amber} />
            <Text style={{ color: colors.amber, fontWeight: "700", flex: 1, fontSize: 14 }}>Offline · showing last received data. Reconnect to save.</Text>
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

// Premium white card with soft shadow; pressable cards scale on touch. `highlight`
// wraps it in a red→green gradient border for the screen's most important card.
export function Card({ children, style, onPress, highlight = false, accessibilityLabel }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void; highlight?: boolean; accessibilityLabel?: string }>) {
  const press = usePressScale(0.985);
  const inner = <View style={[s.card, highlight && { borderWidth: 0, shadowOpacity: 0, elevation: 0 }, style]}>{children}</View>;
  const body = highlight ? (
    <LinearGradient colors={gradients.border} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 22, padding: 2 }, shadow]}>
      {inner}
    </LinearGradient>
  ) : inner;
  if (!onPress) return body;
  return (
    <Animated.View style={press.style}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        {body}
      </Pressable>
    </Animated.View>
  );
}
export const PremiumCard = Card;

type Variant = "primary" | "success" | "secondary" | "danger" | "ghost" | "outline";
const variants: Record<Variant, { bg: string; fg: string; border?: string; gradient?: readonly [string, string] }> = {
  primary: { bg: colors.brand, fg: "#FFFFFF", gradient: gradients.brand },
  success: { bg: colors.green, fg: "#FFFFFF", gradient: gradients.success },
  danger: { bg: colors.brandDark, fg: "#FFFFFF", gradient: gradients.dark },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  outline: { bg: colors.surface, fg: colors.brand, border: "#F6C3C1" },
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
  large,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  icon?: Icon;
  busy?: boolean;
  compact?: boolean;
  large?: boolean;
}) {
  const v = variants[variant], press = usePressScale(0.97), off = disabled || busy;
  const content = (
    <>
      {busy ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={large ? 24 : 20} color={v.fg} /> : null}
      <Text style={[s.buttonText, { color: v.fg }, compact && { fontSize: 15 }, large && { fontSize: 19 }]}>{title}</Text>
    </>
  );
  const box: StyleProp<ViewStyle> = [s.button, compact && { minHeight: 48 }, large && { minHeight: 62, borderRadius: 18 }];
  return (
    <Animated.View style={[press.style, { opacity: disabled ? 0.45 : 1 }, v.gradient && !disabled && (large ? shadowStrong : null)]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !!disabled, busy: !!busy }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={off}
      >
        {v.gradient ? (
          <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={box}>{content}</LinearGradient>
        ) : (
          <View style={[box, { backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border }]}>{content}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}
export const PrimaryCTA = (p: React.ComponentProps<typeof Button>) => <Button large {...p} />;

// The screen's single, obvious next step, pinned above the home indicator.
export function BottomCTA({ note, ...button }: React.ComponentProps<typeof Button> & { note?: string }) {
  return (
    <SafeAreaView edges={["bottom"]} style={s.footer}>
      {!!note && <Text style={s.footerNote}>{note}</Text>}
      <PrimaryCTA {...button} />
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
  const [shown, setShown] = React.useState(false), [focus, setFocus] = React.useState(false);
  return (
    <View style={[s.input, focus && { borderColor: colors.brand, backgroundColor: colors.brandTint }]}>
      {icon && <Ionicons name={icon} size={20} color={focus ? colors.brand : colors.muted} />}
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
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
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

// Segmented pill tabs; the active pill fills red with a short colour transition.
export function Pills({ options, value, onChange }: { options: { value: string; label: string; icon?: Icon }[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillTrack}>
      {options.map((o) => <Pill key={o.value} on={o.value === value} label={o.label} icon={o.icon} onPress={() => onChange(o.value)} />)}
    </ScrollView>
  );
}
function Pill({ on, label, icon, onPress }: { on: boolean; label: string; icon?: Icon; onPress: () => void }) {
  const v = React.useRef(new Animated.Value(on ? 1 : 0)).current, press = usePressScale(0.95);
  React.useEffect(() => {
    if (reduced) v.setValue(on ? 1 : 0);
    else Animated.timing(v, { toValue: on ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [on, v]);
  return (
    <Animated.View style={press.style}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[s.pill, { backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: ["#FFFFFF00", colors.brand] }) }, on && shadow]}>
          {icon && <Ionicons name={icon} size={16} color={on ? "#FFFFFF" : colors.muted} />}
          <Text style={{ color: on ? "#FFFFFF" : colors.text, fontWeight: "700", fontSize: 14.5 }}>{label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function Badge({ label, tone = "grey", icon, large = false }: { label: string; tone?: Tone; icon?: Icon; large?: boolean }) {
  const t = tones[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: large ? 12 : 10, paddingVertical: large ? 6 : 4, alignSelf: "flex-start" }}>
      {icon ? <Ionicons name={icon} size={large ? 15 : 13} color={t.fg} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.fg }} />}
      <Text style={{ color: t.fg, fontSize: large ? 13.5 : 12.5, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
export const StatusChip = Badge;
export function StatusBadge({ booking, large }: { booking: Pick<Booking, "status" | "trip">; large?: boolean }) {
  const info = statusInfo(booking);
  return <Badge label={info.label} tone={info.tone} large={large} />;
}
// Generic record status (documents, payroll, account): words, not raw enum codes.
export function recordTone(value: string): Tone {
  return /CANCEL|REJECT|EXPIRE|SUSPEND|BLOCK|FAIL/.test(value)
    ? "red"
    : /PENDING|MAINTENANCE|RESERV|INACTIVE|SOON|PROCESS|SUBMIT|REVIEW/.test(value)
      ? "amber"
      : /AVAILABLE|ACTIVE|APPROVED|COMPLETED|SETTLED|VERIFIED|PAID/.test(value)
        ? "green"
        : "blue";
}
export function RecordBadge({ value, large }: { value: string; large?: boolean }) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return <Badge label={label.charAt(0).toUpperCase() + label.slice(1)} tone={recordTone(value)} large={large} />;
}

// Rounded tinted square holding an icon — the app's consistent icon container.
export function IconTile({ icon, tone = "grey", size = 44, solid = false }: { icon: Icon; tone?: Tone; size?: number; solid?: boolean }) {
  const t = tones[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: solid ? t.fg : t.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.5} color={solid ? "#FFFFFF" : tone === "grey" ? colors.text : t.fg} />
    </View>
  );
}

// Tinted stat card: icon tile, big value, small label.
export function StatCard({ label, value, icon, tone = "grey", sub }: { label: string; value: string; icon?: Icon; tone?: Tone; sub?: string }) {
  const t = tones[tone];
  return (
    <View style={[s.statCard, { backgroundColor: t.bg }]}>
      {icon && (
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: "#FFFFFFCC", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={t.fg} />
        </View>
      )}
      <Text style={[s.statValue, { color: tone === "grey" ? colors.text : t.fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={2}>{label}</Text>
      {!!sub && <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}
export function StatTiles({ items }: { items: { label: string; value: string; icon?: Icon; tone?: Tone; sub?: string }[]; tinted?: boolean }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{items.map((it) => <StatCard key={it.label} {...it} />)}</View>;
}

// Pickup (red pin) → drop (green pin) joined by a dashed route line.
export function RouteBlock({ pickup, drop, onOpenMap, compact = false }: { pickup: string; drop: string; onOpenMap?: () => void; compact?: boolean }) {
  const dot = (color: string, icon: Icon) => (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color === colors.brand ? colors.brandSoft : colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
  );
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <View style={s.routeRow}>
          {dot(colors.brand, "location")}
          <View style={{ flex: 1 }}>
            {!compact && <Text style={s.routeCaption}>Pickup</Text>}
            <Text style={s.routePlace} numberOfLines={compact ? 2 : 3}>{pickup}</Text>
          </View>
        </View>
        <View style={s.routeLine}>{[0, 1, 2].map((i) => <View key={i} style={s.routeDash} />)}</View>
        <View style={s.routeRow}>
          {dot(colors.green, "flag")}
          <View style={{ flex: 1 }}>
            {!compact && <Text style={s.routeCaption}>Drop</Text>}
            <Text style={s.routePlace} numberOfLines={compact ? 2 : 3}>{drop}</Text>
          </View>
        </View>
      </View>
      {onOpenMap && (
        <Pressable accessibilityRole="button" accessibilityLabel="Open route in Maps" onPress={onOpenMap} style={({ pressed }) => [s.mapTile, pressed && { opacity: 0.8 }]}>
          <Ionicons name="map" size={26} color={colors.blue} />
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.blue }}>Open Map</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Avatar({ name: who, size = 48, ring = false }: { name: string; size?: number; ring?: boolean }) {
  const initials = who.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const inner = (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
  return ring ? <View style={{ padding: 3, borderRadius: size, backgroundColor: "#FFFFFF", ...shadow }}>{inner}</View> : inner;
}

function RoundAction({ icon, label, tone, onPress }: { icon: Icon; label: string; tone: Tone; onPress: () => void }) {
  const press = usePressScale(0.92), t = tones[tone];
  return (
    <Animated.View style={press.style}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ alignItems: "center", gap: 4, minWidth: 56 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={22} color={t.fg} />
        </View>
        <Text style={{ fontSize: 12.5, color: colors.muted, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
// Customer with the two contact actions the platform supports: phone call (only
// while the assignment is operational) and RideGrid support for this trip.
export function CustomerCard({ name: who, caption, onCall, onSupport }: { name: string; caption?: string; onCall?: () => void; onSupport?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Avatar name={who} size={50} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }} numberOfLines={1}>{who}</Text>
        {!!caption && <Label small muted>{caption}</Label>}
      </View>
      {onCall && <RoundAction icon="call" label="Call" tone="red" onPress={onCall} />}
      {onSupport && <RoundAction icon="headset" label="Support" tone="green" onPress={onSupport} />}
    </View>
  );
}

export function VehicleRow({ vehicle: v, onPress }: { vehicle: Vehicle; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <LinearGradient colors={["#F3F4F8", "#E7E9F0"]} style={{ width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="car-sport" size={32} color={colors.text} />
      </LinearGradient>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }} numberOfLines={1}>{v.make} {v.model}</Text>
        <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.bg }}>
          <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.text, letterSpacing: 1 }}>{v.registrationNumber}</Text>
        </View>
        <Label small muted lines={1}>{[v.category, v.fuelType, v.transmission].filter(Boolean).map((x) => x.replaceAll("_", " ").toLowerCase()).join(" • ")}</Label>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.faint} />}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.75 }}>{body}</Pressable> : body;
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
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [s.listRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.bg }]}
    >
      <IconTile icon={icon} tone={tone} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: tone === "red" ? colors.brand : colors.text }}>{title}</Text>
        {!!subtitle && <Label small muted>{subtitle}</Label>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.faint} />}
    </Pressable>
  );
}

// Section heading: optional icon tile, title, concise supporting text, optional link.
export function SectionTitle({ title, sub, icon, tone = "red", action, onAction }: { title: string; sub?: string; icon?: Icon; tone?: Tone; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
      {icon && <IconTile icon={icon} tone={tone} size={34} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17.5, fontWeight: "800", color: colors.text, letterSpacing: -0.2 }}>{title}</Text>
        {!!sub && <Text style={{ fontSize: 13, color: colors.muted }}>{sub}</Text>}
      </View>
      {action && onAction && (
        <Pressable accessibilityRole="link" hitSlop={12} onPress={onAction} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.blue, fontWeight: "800", fontSize: 14 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
export const SectionHeader = SectionTitle;

export function Notice({ icon = "information-circle-outline", text, title, tone = "amber", onPress }: { icon?: Icon; text: string; title?: string; tone?: Tone; onPress?: () => void }) {
  const t = tones[tone];
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: t.bg, borderRadius: 16, padding: 14, borderLeftWidth: 4, borderLeftColor: t.fg }, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={24} color={t.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {!!title && <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>{title}</Text>}
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{text}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={t.fg} />}
    </Pressable>
  );
}

// Shimmering skeleton cards while data loads.
export function LoadingState({ rows = 2 }: { rows?: number }) {
  const still = useReducedMotion();
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [still, v]);
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[s.card, { height: 104, overflow: "hidden", gap: 10 }]}>
          <View style={{ width: "45%", height: 14, borderRadius: 7, backgroundColor: colors.greySoft }} />
          <View style={{ width: "80%", height: 14, borderRadius: 7, backgroundColor: colors.greySoft }} />
          <View style={{ width: "60%", height: 14, borderRadius: 7, backgroundColor: colors.greySoft }} />
          {!still && (
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, width: 120, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-140, 420] }) }] }}>
              <LinearGradient colors={["#FFFFFF00", "#FFFFFFAA", "#FFFFFF00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </Animated.View>
          )}
        </View>
      ))}
    </View>
  );
}
export function EmptyState({ title = "Nothing here yet", text = "New activity will appear here when available.", icon = "file-tray-outline", tone = "grey" }: { title?: string; text?: string; icon?: Icon; tone?: Tone }) {
  return (
    <View style={s.state}>
      <IconTile icon={icon} tone={tone} size={68} />
      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center" }}>{title}</Text>
      <Label muted center>{text}</Label>
    </View>
  );
}
// Loading skeleton, error with retry, or empty state — whichever applies.
export function StateView({
  loading,
  error,
  empty,
  retry,
  emptyTitle,
  emptyText,
  emptyIcon,
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  retry?: () => void;
  emptyTitle?: string;
  emptyText?: string;
  emptyIcon?: Icon;
}) {
  if (loading) return <LoadingState />;
  if (error)
    return (
      <View style={[s.card, s.state]}>
        <IconTile icon="alert-circle-outline" tone="red" size={64} />
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>Couldn’t load this</Text>
        <Label muted center>{error.message}</Label>
        {retry && <Button title="Try again" icon="refresh" variant="outline" compact onPress={retry} />}
      </View>
    );
  if (empty) return <EmptyState title={emptyTitle} text={emptyText} icon={emptyIcon} />;
  return null;
}

export function TripCard({ booking: b }: { booking: Booking }) {
  const when = istParts(b.pickupDateTime);
  const info = statusInfo(b);
  return (
    <Card onPress={() => router.push({ pathname: "/trip", params: { id: b.id } })} accessibilityLabel={`Trip ${b.bookingNumber}, ${info.label}`} style={{ borderLeftWidth: 4, borderLeftColor: tones[info.tone].fg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{when?.time || "—"}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>{when?.date || "Time not recorded"}</Text>
        </View>
        <StatusBadge booking={b} large />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} compact />
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.faint} />
      </View>
      <View style={s.tripMeta}>
        <View style={s.metaItem}><Ionicons name="car-outline" size={15} color={colors.muted} /><Text style={s.metaText}>{b.vehicle?.registrationNumber}</Text></View>
        <View style={s.metaItem}><Ionicons name="pricetag-outline" size={15} color={colors.muted} /><Text style={s.metaText}>{b.bookingNumber}</Text></View>
      </View>
    </Card>
  );
}

export const name = (d: DriverName | null | undefined) => (d ? `${d.firstName} ${d.lastName}` : "Unassigned");
export const money = (v: string | number | null | undefined) =>
  v == null ? "Not recorded" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const dateTime = (v: string | null | undefined) => (v ? `${formatDateTime(v)} IST` : "Not recorded");

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerSide: { width: 56 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
  iconButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23 },
  offline: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.amberSoft, paddingHorizontal: 16, paddingVertical: 10 },
  body: { padding: 16, paddingBottom: 36, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: "#F0F1F5", ...shadow },
  button: { minHeight: 56, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center" },
  buttonText: { fontWeight: "800", textAlign: "center", fontSize: 17, letterSpacing: 0.2 },
  footer: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, ...Platform.select<ViewStyle>({ android: { elevation: 16 }, default: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } } }) },
  footerNote: { color: colors.muted, fontSize: 13.5, textAlign: "center" },
  input: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.surface, minHeight: 58 },
  inputText: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  pillTrack: { gap: 6, padding: 5, backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 16, minHeight: 44, justifyContent: "center" },
  statCard: { flex: 1, borderRadius: 18, padding: 12, gap: 6, minHeight: 112 },
  statValue: { fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  statLabel: { fontSize: 12.5, color: colors.muted, fontWeight: "700" },
  routeRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  routeLine: { width: 28, alignItems: "center", gap: 3, paddingVertical: 3 },
  routeDash: { width: 2, height: 4, borderRadius: 1, backgroundColor: "#CFD2DA" },
  routeCaption: { fontSize: 11.5, color: colors.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7 },
  routePlace: { fontSize: 16, fontWeight: "700", color: colors.text, lineHeight: 21 },
  mapTile: { width: 84, height: 84, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", gap: 4 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 4, minHeight: 64, borderRadius: 12 },
  state: { alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  tripMeta: { flexDirection: "row", gap: 16, flexWrap: "wrap", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  metaItem: { flexDirection: "row", gap: 5, alignItems: "center" },
  metaText: { fontSize: 13.5, color: colors.muted, fontWeight: "700" },
});
