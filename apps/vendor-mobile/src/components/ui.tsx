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
import type { Booking, Document, Driver, DriverName, Standing, Vehicle } from "../types";
import { formatDateTime, istParts } from "../utils/when";
import { bookingStatus, documentAlert, statusLabel, statusTone, type Tone } from "../utils/status";

// RideGrid Vendor design system: bright white base, RideGrid red for primary actions,
// charcoal text, green success/verified, blue secondary/completed, amber pending.
export const colors = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#ECEDF2",
  text: "#14161B",
  muted: "#666B7A",
  faint: "#A2A6B2",
  brand: "#E53935",
  brandDark: "#C62828",
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
  hero: ["#E53935", "#C62828", "#8E1B1B"] as const,
  blush: ["#FFF1F1", "#FFFFFF"] as const,
  mint: ["#ECFAF1", "#FFFFFF"] as const,
  soft: ["#FFE7E6", "#FFF6F2", "#FFFFFF"] as const,
  border: ["#F26B66", "#FFC7C4", "#7DD3A5"] as const,
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
export type { Tone };

// ---- Motion: subtle, and off when the OS asks for reduced motion. ----
let reduced = false;
void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduced = v)).catch(() => {});
export function useReducedMotion() {
  const [value, set] = React.useState(reduced);
  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduced = v; set(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => { reduced = v; set(v); });
    return () => sub.remove();
  }, []);
  return value;
}
function usePressScale(to = 0.97) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const go = (v: number) => () => {
    if (reduced) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  return { style: { transform: [{ scale }] }, onPressIn: go(to), onPressOut: go(1) };
}
export function FadeIn({ children, delay = 0, style }: React.PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const v = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  React.useEffect(() => {
    if (reduced) return;
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>{children}</Animated.View>;
}
// Slow breathing glow behind an urgent card.
export function Pulse({ children, active = true, color = colors.brand, radius = 22 }: React.PropsWithChildren<{ active?: boolean; color?: string; radius?: number }>) {
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
          style={{ ...StyleSheet.absoluteFillObject, borderRadius: radius, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] }}
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
        fontSize: large ? 20 : small ? 13.5 : 15,
        fontWeight: large ? "800" : bold ? "700" : "400",
        lineHeight: large ? 26 : small ? 19 : 21,
        textAlign: center ? "center" : "left",
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}

const TAB_ROOTS = ["/", "/bookings", "/fleet", "/drivers", "/more", "/login"];
// Back chevron with a centred title (or a custom header), scrolling body, and an
// optional fixed footer holding the screen's primary action.
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
          <View style={s.banner}>
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
  const inner = <View style={[s.card, highlight && { borderWidth: 0, elevation: 0, shadowOpacity: 0 }, style]}>{children}</View>;
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
// `secondary` / `danger` booleans are kept for existing call sites.
export function Button({
  title,
  onPress,
  disabled,
  variant,
  secondary,
  danger,
  icon,
  busy,
  compact,
  large,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  secondary?: boolean;
  danger?: boolean;
  icon?: Icon;
  busy?: boolean;
  compact?: boolean;
  large?: boolean;
}) {
  const v = variants[variant || (danger ? "danger" : secondary ? "secondary" : "primary")], press = usePressScale(0.97);
  const content = (
    <>
      {busy ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={large ? 23 : 20} color={v.fg} /> : null}
      <Text style={[s.buttonText, { color: v.fg }, compact && { fontSize: 15 }, large && { fontSize: 18.5 }]} numberOfLines={2}>{title}</Text>
    </>
  );
  const box: StyleProp<ViewStyle> = [s.button, compact && { minHeight: 48 }, large && { minHeight: 60, borderRadius: 18 }];
  return (
    <Animated.View style={[press.style, { opacity: disabled ? 0.45 : 1 }, v.gradient && !disabled && large ? shadowStrong : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !!disabled, busy: !!busy }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={disabled || busy}
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
  numeric = false,
  multiline = false,
  icon,
  placeholder,
  hideLabel = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secret?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  icon?: Icon;
  placeholder?: string;
  hideLabel?: boolean;
  keyboardType?: "default" | "email-address";
}) {
  const [shown, setShown] = React.useState(false), [focus, setFocus] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      {!hideLabel && <Text style={s.fieldLabel}>{label}</Text>}
      <View style={[s.input, { flexDirection: "row", alignItems: "center", gap: 10 }, multiline && { minHeight: 96, alignItems: "flex-start" }, focus && { borderColor: colors.brand, backgroundColor: colors.brandTint }]}>
        {icon && <Ionicons name={icon} size={20} color={focus ? colors.brand : colors.muted} />}
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder ?? (hideLabel ? label : undefined)}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          secureTextEntry={secret && !shown}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={numeric ? "decimal-pad" : keyboardType || "default"}
          multiline={multiline}
          placeholderTextColor={colors.faint}
          style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 }}
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
    </View>
  );
}

const chipLabel = (v: string) => (v === "8_80" ? "8 hr / 80 km" : v === "12_120" ? "12 hr / 120 km" : v === "" ? "All" : statusLabel(v));
// Wrapping choice chips (forms and multi-value pickers); active chip fills red.
export function Chips({ values, value, onChange, label = chipLabel }: { values: string[]; value: string | undefined; onChange: (v: string) => void; label?: (v: string) => string }) {
  return (
    <View style={s.wrap}>
      {values.map((v) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(v)}
            style={({ pressed }) => [s.chip, on && { backgroundColor: colors.brand, borderColor: colors.brand }, pressed && { opacity: 0.8 }]}
          >
            <Text style={{ color: on ? "#FFFFFF" : colors.text, fontSize: 14, fontWeight: "700" }}>{label(v)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
// Horizontally scrolling filter tabs with an animated active state.
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
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={{ top: 6, bottom: 6 }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[s.pill, { backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [colors.greySoft, colors.brand] }) }, on && shadow]}>
          {icon && <Ionicons name={icon} size={15} color={on ? "#FFFFFF" : colors.muted} />}
          <Text style={{ color: on ? "#FFFFFF" : colors.grey, fontWeight: "700", fontSize: 13.5 }}>{label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function StatusChip({ label, tone = "grey", icon, large = false }: { label: string; tone?: Tone; icon?: Icon; large?: boolean }) {
  const t = tones[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: large ? 12 : 10, paddingVertical: large ? 6 : 4, alignSelf: "flex-start" }}>
      {icon ? <Ionicons name={icon} size={large ? 15 : 13} color={t.fg} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.fg }} />}
      <Text style={{ color: t.fg, fontSize: large ? 13.5 : 12.5, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
// A server status code shown as a coloured chip with plain words.
export function Badge({ value, large }: { value: string; large?: boolean }) {
  return <StatusChip label={statusLabel(value)} tone={statusTone(value)} large={large} />;
}

export function IconTile({ icon, tone = "grey", size = 44, solid = false }: { icon: Icon; tone?: Tone; size?: number; solid?: boolean }) {
  const t = tones[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: solid ? t.fg : t.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.5} color={solid ? "#FFFFFF" : tone === "grey" ? colors.text : t.fg} />
    </View>
  );
}
// Compact centred KPI tile on a pale tint: icon, number, label (reference proportions).
export function StatCard({ label, value, icon, tone = "grey", onPress }: { label: string; value: string | number; icon?: Icon; tone?: Tone; onPress?: () => void }) {
  const t = tones[tone], press = usePressScale(0.96);
  const body = (
    <View style={[s.statCard, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={22} color={t.fg} />}
      <Text style={[s.statValue, { color: tone === "grey" ? colors.text : t.fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{body}</View>;
  return (
    <Animated.View style={[{ flex: 1 }, press.style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>{body}</Pressable>
    </Animated.View>
  );
}

// Pickup (red pin) → drop (green flag) joined by a dashed route line.
export function RouteBlock({ pickup, drop, compact = false }: { pickup: string; drop: string; compact?: boolean }) {
  const dot = (tone: "red" | "green", icon: Icon) => (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tones[tone].bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={16} color={tones[tone].fg} />
    </View>
  );
  return (
    <View>
      <View style={s.routeRow}>
        {dot("red", "location")}
        <View style={{ flex: 1 }}>
          {!compact && <Text style={s.routeCaption}>Pickup</Text>}
          <Text style={s.routePlace} numberOfLines={compact ? 2 : 3}>{pickup}</Text>
        </View>
      </View>
      <View style={s.routeLine}>{[0, 1, 2].map((i) => <View key={i} style={s.routeDash} />)}</View>
      <View style={s.routeRow}>
        {dot("green", "flag")}
        <View style={{ flex: 1 }}>
          {!compact && <Text style={s.routeCaption}>Drop</Text>}
          <Text style={s.routePlace} numberOfLines={compact ? 2 : 3}>{drop}</Text>
        </View>
      </View>
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
        <Text style={{ fontSize: 16, fontWeight: "700", color: tone === "red" && !subtitle ? colors.brand : colors.text }}>{title}</Text>
        {!!subtitle && <Label small muted>{subtitle}</Label>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.faint} />}
    </Pressable>
  );
}
// Grouped menu: a white card of list rows.
export function Menu({ children }: React.PropsWithChildren) {
  return <Card style={{ gap: 0, paddingVertical: 6 }}>{children}</Card>;
}
// Navigation row (kept for existing call sites).
export function LinkButton({ title, href, icon = "arrow-forward-circle-outline", subtitle, tone = "grey" }: { title: string; href: string; icon?: Icon; subtitle?: string; tone?: Tone }) {
  return (
    <Card style={{ paddingVertical: 4 }}>
      <ListRow icon={icon} tone={tone} title={title} subtitle={subtitle} last onPress={() => router.push(href as never)} />
    </Card>
  );
}

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
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <View style={[s.card, s.state]}>
      <IconTile icon="alert-circle-outline" tone="red" size={64} />
      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>Something went wrong</Text>
      <Label muted center>{error.message}</Label>
      {retry && <Button title="Try again" icon="refresh" variant="outline" compact onPress={retry} />}
    </View>
  );
}
// Loading skeleton, error with retry, or empty state — whichever applies.
export function State({
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
  if (error) return <ErrorState error={error} retry={retry} />;
  if (empty) return <EmptyState title={emptyTitle} text={emptyText} icon={emptyIcon} />;
  return null;
}

export const name = (d: DriverName | null | undefined) => (d ? `${d.firstName} ${d.lastName}` : "Unassigned");
export const money = (v: string | number | null | undefined) =>
  v == null ? "Not recorded" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const dateTime = (v: string | null | undefined) => (v ? `${formatDateTime(v)} IST` : "Not recorded");
export const shortId = (id: string) => id.slice(-6).toUpperCase();

// Vehicle visual: the app has no vehicle photos, so a polished silhouette tile.
export function CarThumb({ size = 64 }: { size?: number }) {
  return (
    <LinearGradient colors={["#F4F5F9", "#E4E7EF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size * 0.78, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="car-sport" size={size * 0.56} color="#3A3F4B" />
    </LinearGradient>
  );
}
const Chevron = () => <Ionicons name="chevron-forward" size={18} color={colors.faint} />;

// Compact booking row: status chip, car visual, number, route, date, earning, chevron.
export function BookingCard({ booking: b }: { booking: Booking }) {
  const when = istParts(b.pickupDateTime), status = bookingStatus(b);
  return (
    <Card onPress={() => router.push({ pathname: "/booking", params: { id: b.id } })} accessibilityLabel={`Booking ${b.bookingNumber}, ${statusLabel(status)}`} style={s.rowCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <CarThumb size={58} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.rowTitle} numberOfLines={1}>{b.bookingNumber}</Text>
          </View>
          <Text style={s.rowRoute} numberOfLines={1}>{shortPlace(b.pickupLocation)} → {shortPlace(b.dropLocation)}</Text>
          <Text style={s.rowMeta} numberOfLines={1}>{when ? `${when.date}, ${when.time}` : "Time not recorded"}</Text>
          <Text style={s.rowMeta} numberOfLines={1}>{b.vehicle?.registrationNumber}{b.driver ? ` • ${name(b.driver)}` : ""}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8, maxWidth: 120 }}>
          <Badge value={status} />
          {b.vendorEarning != null && <Text style={s.rowAmount}>{money(b.vendorEarning)}</Text>}
        </View>
        <Chevron />
      </View>
    </Card>
  );
}
// First part of an address ("Pune Airport, Lohegaon, Pune" → "Pune Airport").
export const shortPlace = (place: string) => (place || "").split(",")[0].trim() || place;

const alerts = (docs: Document[] | undefined) => (docs || []).filter((d) => documentAlert(d) || /REJECT|EXPIRE/.test(d.status)).length;
export function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  const due = alerts(v.documents);
  return (
    <Card onPress={() => router.push({ pathname: "/vehicle", params: { id: v.id } })} accessibilityLabel={`${v.make} ${v.model} ${v.registrationNumber}`} style={s.rowCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <CarThumb size={70} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle} numberOfLines={1}>{v.make} {v.model}</Text>
          <Text style={[s.rowRoute, { letterSpacing: 0.6 }]}>{v.registrationNumber}</Text>
          <Text style={s.rowMeta} numberOfLines={1}>{[statusLabel(v.category), v.seatingCapacity ? `${v.seatingCapacity} Seater` : ""].filter(Boolean).join(" • ")}</Text>
          {due > 0 ? (
            <Text style={[s.rowMeta, { color: colors.brand, fontWeight: "800" }]}>{due} document{due === 1 ? "" : "s"} need attention</Text>
          ) : (
            <Text style={s.rowMeta} numberOfLines={1}>{v.driver ? name(v.driver) : "No driver aligned"}</Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <Badge value={v.status} />
          {!v.isVerified && <StatusChip label="Unverified" tone="amber" />}
        </View>
        <Chevron />
      </View>
    </Card>
  );
}
export function DriverCard({ driver: d }: { driver: Driver }) {
  const due = alerts(d.documents);
  return (
    <Card onPress={() => router.push({ pathname: "/driver", params: { id: d.id } })} accessibilityLabel={name(d)} style={s.rowCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name(d)} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle} numberOfLines={1}>{name(d)}</Text>
          <Text style={s.rowMeta}>ID {shortId(d.id)}</Text>
          {!!d.user?.mobile && <Text style={s.rowRoute}>{d.user.mobile}</Text>}
          {due > 0 ? (
            <Text style={[s.rowMeta, { color: colors.brand, fontWeight: "800" }]}>{due} document{due === 1 ? "" : "s"} need attention</Text>
          ) : (
            <Text style={s.rowMeta} numberOfLines={1}>{d.vehicles?.length ? d.vehicles.map((v) => v.registrationNumber).join(", ") : "No vehicle aligned"}</Text>
          )}
        </View>
        <Badge value={d.status} />
        <Chevron />
      </View>
    </Card>
  );
}
const DOC_ICONS: Record<string, Icon> = {
  RC: "document-text-outline",
  INSURANCE: "shield-checkmark-outline",
  PERMIT: "ribbon-outline",
  FITNESS: "fitness-outline",
  POLLUTION: "leaf-outline",
  TAX: "receipt-outline",
  DRIVING_LICENSE: "card-outline",
  AADHAAR: "finger-print-outline",
  PAN: "card-outline",
  GST: "business-outline",
  UDYAM: "briefcase-outline",
};
// One document line: coloured icon, name, validity, status chip.
export function DocumentRow({ doc: d, last = false }: { doc: Document; last?: boolean }) {
  const alert = documentAlert(d);
  const tone: Tone = alert ? (alert === "EXPIRED" ? "red" : "amber") : statusTone(d.status);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 64 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <IconTile icon={DOC_ICONS[d.documentType] || "document-text-outline"} tone={tone} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>{statusLabel(d.documentType)}</Text>
        <Text style={{ fontSize: 12.5, color: alert ? tones[tone].fg : colors.muted, fontWeight: alert ? "800" : "500" }}>
          {d.expiryDate ? `Valid till ${istParts(d.expiryDate)?.date ?? dateTime(d.expiryDate)}` : "No expiry recorded"}
        </Text>
      </View>
      <Badge value={alert || d.status} />
    </View>
  );
}
export const DocumentCard = ({ doc }: { doc: Document }) => <Card style={{ paddingVertical: 4 }}><DocumentRow doc={doc} last /></Card>;
export function Documents({ items }: { items: Document[] }) {
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title="Documents" sub={`${items.length} recorded`} icon="document-text-outline" tone="blue" />
      {items.length ? (
        <Card style={{ gap: 0, paddingVertical: 4 }}>{items.map((d, i) => <DocumentRow key={d.id} doc={d} last={i === items.length - 1} />)}</Card>
      ) : (
        <Card><EmptyState icon="document-text-outline" title="No documents recorded" text="Upload a document for RideGrid verification." /></Card>
      )}
    </View>
  );
}

// Marketplace standing computed by the server: compact status strip.
export function StandingCard({ standing: st }: { standing: Standing }) {
  const listed = st.state === "VERIFIED" && st.liveVehicles > 0;
  const tone: Tone = st.state === "SUSPENDED" ? "red" : listed ? "green" : "amber";
  return (
    <View style={[s.card, { gap: 8, paddingVertical: 14, borderLeftWidth: 4, borderLeftColor: tones[tone].fg }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconTile icon={listed ? "storefront" : st.state === "SUSPENDED" ? "ban" : "hourglass"} tone={tone} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "800", letterSpacing: 0.6 }}>MARKETPLACE STATUS</Text>
          <Text style={{ fontSize: 15.5, fontWeight: "800", color: colors.text }}>
            {listed ? `${st.liveVehicles} of ${st.totalVehicles} vehicle${st.totalVehicles === 1 ? "" : "s"} live` : "Not visible to customers yet"}
          </Text>
        </View>
        <View style={{ gap: 4, alignItems: "flex-end" }}>
          <Badge value={st.state === "PENDING" ? "VERIFICATION_PENDING" : st.state} />
          <Badge value={listed ? "LISTED" : "NOT_LISTED"} />
        </View>
      </View>
      {st.reasons.map((r) => (
        <View key={r} style={{ flexDirection: "row", gap: 6, paddingLeft: 52 }}>
          <Ionicons name="alert-circle-outline" size={15} color={tones[tone].fg} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.muted }}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerSide: { width: 56 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
  iconButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23 },
  banner: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.amberSoft, paddingHorizontal: 16, paddingVertical: 10 },
  body: { padding: 16, paddingBottom: 36, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: "#F0F1F5", ...shadow },
  button: { minHeight: 54, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center" },
  buttonText: { fontWeight: "800", textAlign: "center", fontSize: 16.5, letterSpacing: 0.2, flexShrink: 1 },
  footer: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, ...Platform.select<ViewStyle>({ android: { elevation: 16 }, default: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } } }) },
  footerNote: { color: colors.muted, fontSize: 13.5, textAlign: "center" },
  fieldLabel: { fontSize: 13, color: colors.muted, fontWeight: "700" },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.surface, minHeight: 54 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, minHeight: 44, justifyContent: "center" },
  pillTrack: { gap: 8, paddingVertical: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  statCard: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, gap: 3, minHeight: 92, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 21, fontWeight: "900", letterSpacing: -0.3 },
  statLabel: { fontSize: 11.5, color: colors.muted, fontWeight: "700", textAlign: "center" },
  rowCard: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 18 },
  rowTitle: { fontSize: 15.5, fontWeight: "800", color: colors.text, flexShrink: 1 },
  rowRoute: { fontSize: 14, fontWeight: "700", color: colors.text },
  rowMeta: { fontSize: 12.5, color: colors.muted, fontWeight: "500" },
  rowAmount: { fontSize: 16, fontWeight: "900", color: colors.text },
  routeRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  routeLine: { width: 28, alignItems: "center", gap: 3, paddingVertical: 3 },
  routeDash: { width: 2, height: 4, borderRadius: 1, backgroundColor: "#CFD2DA" },
  routeCaption: { fontSize: 11.5, color: colors.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7 },
  routePlace: { fontSize: 15.5, fontWeight: "700", color: colors.text, lineHeight: 21 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 4, minHeight: 64, borderRadius: 12 },
  state: { alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  tripMeta: { flexDirection: "row", gap: 14, flexWrap: "wrap", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  metaItem: { flexDirection: "row", gap: 5, alignItems: "center", maxWidth: "100%" },
  metaText: { fontSize: 13.5, color: colors.muted, fontWeight: "700", flexShrink: 1 },
  plate: { alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.bg },
  plateText: { fontSize: 13.5, fontWeight: "800", color: colors.text, letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
});
