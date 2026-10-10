import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { styles, theme, Button } from "./ui";
import { baseURL } from "../services/api";
import { label, money } from "../utils/journey";
import type { Listing } from "../types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function Brand({
  large = false,
  light = false,
  tagline = false,
}: {
  large?: boolean;
  light?: boolean;
  tagline?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: large ? 10 : 6 }}>
        <View
          style={{
            width: large ? 46 : 28,
            height: large ? 46 : 28,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="location-sharp" size={large ? 46 : 28} color={theme.brand} />
          <View
            style={{
              position: "absolute",
              top: large ? 11 : 6.5,
              width: large ? 15 : 9,
              height: large ? 15 : 9,
              borderRadius: large ? 8 : 5,
              backgroundColor: "white",
            }}
          />
        </View>
        <Text
          style={{
            color: light ? "white" : theme.ink,
            fontSize: large ? 38 : 22,
            fontWeight: "900",
            letterSpacing: large ? -1.4 : -0.8,
          }}
        >
          Ride<Text style={{ color: light ? "#FF4D5A" : theme.brand }}>Grid</Text>
        </Text>
      </View>
      {tagline && (
        <Text
          style={{
            color: light ? "#D8DBE2" : theme.muted,
            fontSize: large ? 12.5 : 11,
            fontWeight: "500",
            letterSpacing: 0.2,
          }}
        >
          Exact Cars. Real Drivers. Better Rides.
        </Text>
      )}
    </View>
  );
}
export function Badge({
  text,
  tone = "cyan",
  icon,
}: {
  text: string;
  tone?: "cyan" | "gold" | "green" | "blue";
  icon?: IconName;
}) {
  const color =
    tone === "gold"
      ? theme.gold
      : tone === "green"
        ? theme.success
        : tone === "blue"
          ? theme.blue
          : theme.brand;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
        backgroundColor: `${color}14`,
      }}
    >
      {icon && <Ionicons name={icon} color={color} size={12} />}
      <Text style={{ color, fontSize: 11, fontWeight: "700", flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}
export function PriceDisplay({
  value,
  caption = "Total for your journey",
  align = "left",
}: {
  value: string | number | null;
  caption?: string;
  align?: "left" | "right";
}) {
  return (
    <View style={{ gap: 2, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <Text
        style={{
          color: theme.ink,
          fontSize: 28,
          fontWeight: "800",
          letterSpacing: -0.8,
        }}
      >
        {money(value)}
      </Text>
      <Text style={styles.small}>{caption}</Text>
    </View>
  );
}
export function SectionHeader({
  title,
  caption,
  action,
  onAction,
  icon,
}: {
  title: string;
  caption?: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ gap: 2, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          {icon && <Ionicons name={icon} size={16} color={theme.brand} />}
          <Text style={[styles.heading, { fontSize: 16 }]}>{title}</Text>
        </View>
        {caption && <Text style={styles.small}>{caption}</Text>}
      </View>
      {action && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <Text style={{ color: theme.brand, fontWeight: "700", fontSize: 13 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
// Round icon inside a soft tinted disc — the one icon treatment used app-wide.
export function IconDisc({ name, size = 40, tint = theme.brand }: { name: IconName; size?: number; tint?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${tint}14`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size * 0.5} color={tint} />
    </View>
  );
}
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <LinearGradient
      colors={[theme.brand, theme.brandDark]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "800", fontSize: size * 0.38 }}>{initials || "R"}</Text>
    </LinearGradient>
  );
}
export function QuickAction({
  icon,
  title,
  onPress,
  tint = theme.brand,
}: {
  icon: IconName;
  title: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 64,
        alignItems: "center",
        gap: 8,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: `${tint}16`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={26} color={tint} />
      </View>
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: theme.ink, textAlign: "center" }} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}
export function TrustRow({ items }: { items: [IconName, string][] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
      {items.map(([icon, text]) => (
        <View key={text} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Ionicons name={icon} size={22} color={theme.brand} />
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: theme.muted, textAlign: "center" }}>{text}</Text>
        </View>
      ))}
    </View>
  );
}
// Segmented trip-type control: a soft grey track with a red pill on the active segment.
export function SegmentTabs({
  values,
  value,
  onChange,
  format = (s: string) => s,
}: {
  values: string[];
  value: string;
  onChange: (s: string) => void;
  format?: (s: string) => string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.field,
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}
    >
      {values.map((s) => {
        const on = value === s;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(s)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
              backgroundColor: on ? theme.brand : "transparent",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: on ? "700" : "600",
                color: on ? "white" : theme.muted,
              }}
            >
              {format(s)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
// Pickup → drop-off timeline: red ring, dashed connector, dark pin.
export function RouteLine({
  from,
  to,
  fromCaption,
  toCaption,
}: {
  from: string;
  to: string;
  fromCaption?: string;
  toCaption?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center", paddingTop: 3 }}>
        <Ionicons name="radio-button-on" size={16} color={theme.brand} />
        <View
          style={{
            flex: 1,
            marginVertical: 3,
            borderLeftWidth: 2,
            borderLeftColor: "#D5D8DF",
            borderStyle: "dashed",
          }}
        />
        <Ionicons name="location" size={17} color={theme.ink} />
      </View>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ gap: 1 }}>
          {fromCaption && <Text style={[styles.small, { fontSize: 11.5 }]}>{fromCaption}</Text>}
          <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={2}>
            {from}
          </Text>
        </View>
        <View style={{ gap: 1 }}>
          {toCaption && <Text style={[styles.small, { fontSize: 11.5 }]}>{toCaption}</Text>}
          <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={2}>
            {to}
          </Text>
        </View>
      </View>
    </View>
  );
}
export function VehicleVisual({
  photos = [],
  name,
  compact = false,
  thumb = false,
}: {
  photos?: string[];
  name: string;
  compact?: boolean;
  thumb?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const photo = photos[index];
  const uri = photo?.startsWith("/") ? `${baseURL}${photo}` : photo;
  const height = thumb ? 84 : compact ? 150 : 240;
  const radius = thumb ? 14 : 18;
  return (
    <View style={{ gap: 8, ...(thumb ? { width: 104 } : null) }}>
      {uri && /^https?:\/\//.test(uri) && !failed.includes(uri) ? (
        <Image
          accessibilityLabel={name}
          source={{ uri }}
          resizeMode="cover"
          onError={() => setFailed((v) => [...v, uri])}
          style={{
            width: "100%",
            height,
            borderRadius: radius,
            backgroundColor: theme.field,
          }}
        />
      ) : (
        <LinearGradient
          colors={["#1B1F2A", "#0B0D12"]}
          style={{
            height,
            borderRadius: radius,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="car-sport" size={thumb ? 40 : compact ? 62 : 92} color="#3A4050" />
          {!thumb && <Text style={[styles.small, { color: "#8A90A0" }]}>{name}</Text>}
        </LinearGradient>
      )}
      {!thumb && photos.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          {photos.slice(0, 6).map((_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Vehicle photo ${i + 1}`}
              onPress={() => setIndex(i)}
              style={{
                minWidth: 36,
                minHeight: 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: i === index ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? theme.brand : theme.line,
                }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
function Spec({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={13} color={theme.muted} />
      <Text style={[styles.small, { fontSize: 12 }]}>{text}</Text>
    </View>
  );
}
export function Specs({ listing: l }: { listing: Listing }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
      <Spec icon="car-outline" text={label(l.vehicle.category)} />
      <Spec icon="people-outline" text={`${l.vehicle.seatingCapacity} seats`} />
      <Spec icon="flash-outline" text={label(l.vehicle.fuelType)} />
      <Spec icon="settings-outline" text={label(l.vehicle.transmission)} />
    </View>
  );
}
export function DriverBlock({ listing: l }: { listing: Listing }) {
  if (!l.driver) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Avatar name={l.driver.name} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
          {l.driver.name}
        </Text>
        <Text style={styles.small}>Your driver</Text>
      </View>
      {l.driver.verified && <Badge text="Verified Driver" tone="green" icon="shield-checkmark" />}
    </View>
  );
}
export function VendorBlock({ listing: l }: { listing: Listing }) {
  if (!l.vendor) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <IconDisc name="business-outline" size={38} tint={theme.blue} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
          {l.vendor.companyName}
        </Text>
        <Text style={styles.small}>Vendor</Text>
      </View>
      {l.vendor.approved && <Badge text="Verified Vendor" tone="green" icon="shield-checkmark" />}
    </View>
  );
}
export function VehicleIdentity({ listing: l }: { listing: Listing }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ gap: 3, flex: 1 }}>
          <Text style={[styles.title, { fontSize: 22, lineHeight: 28 }]}>
            {l.vehicle.make} {l.vehicle.model}
          </Text>
          {l.vendor && (
            <Text style={styles.small} numberOfLines={1}>
              {l.vendor.companyName}
              {l.vehicle.registrationNumber ? ` · ${l.vehicle.registrationNumber}` : ""}
            </Text>
          )}
        </View>
        {l.ratings?.vehicle?.count && l.ratings.vehicle.average != null ? (
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="star" size={15} color="#F5A524" />
              <Text style={{ fontWeight: "800", color: theme.ink }}>{l.ratings.vehicle.average}</Text>
            </View>
            <Text style={styles.small}>{l.ratings.vehicle.count} reviews</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {l.marketplace?.verified && (
          <Badge text="Verified Vehicle" tone="green" icon="shield-checkmark" />
        )}
        {l.marketplace?.available && (
          <Badge text="Available for your dates" icon="calendar-outline" />
        )}
      </View>
      <Specs listing={l} />
    </View>
  );
}
export const MarketplaceCard = React.memo(function MarketplaceCard({
  listing,
  best,
  onPress,
  disabled,
}: {
  listing: Listing;
  best: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const rating = listing.ratings?.vehicle;
  return (
    <View style={[styles.card, { padding: 14, gap: 12 }]}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View>
          <VehicleVisual
            thumb
            photos={listing.media?.vehiclePhotos}
            name={`${listing.vehicle.make} ${listing.vehicle.model}`}
          />
          {best && (
            <View
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                backgroundColor: theme.brand,
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Ionicons name="ribbon" size={10} color="white" />
              <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>Best price</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
            <Text style={[styles.heading, { flex: 1, fontSize: 16, lineHeight: 21 }]} numberOfLines={2}>
              {listing.vehicle.make} {listing.vehicle.model}
            </Text>
            {listing.marketplace?.verified && (
              <Ionicons name="shield-checkmark" size={17} color={theme.success} />
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {rating?.count && rating.average != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name="star" size={12} color="#F5A524" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.ink }}>
                  {rating.average}
                </Text>
                <Text style={styles.small}>({rating.count})</Text>
              </View>
            ) : null}
            {!!listing.vendor && (
              <Text style={[styles.small, { flexShrink: 1 }]} numberOfLines={1}>
                {listing.vendor.companyName}
              </Text>
            )}
          </View>
          <Specs listing={listing} />
        </View>
      </View>
      {(listing.driver || listing.vendor) && (
        <>
          <View style={{ height: 1, backgroundColor: theme.line }} />
          <DriverBlock listing={listing} />
          {!listing.driver && <VendorBlock listing={listing} />}
        </>
      )}
      <View style={{ height: 1, backgroundColor: theme.line }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flexShrink: 1, gap: 1 }}>
          <Text
            style={{
              color: theme.ink,
              fontSize: 24,
              fontWeight: "800",
              letterSpacing: -0.7,
            }}
          >
            {money(listing.pricing.finalPayable)}
          </Text>
          <Text style={[styles.small, { fontSize: 12 }]}>
            Total fare · {listing.pricing.includedKm} km included
          </Text>
        </View>
        <View style={{ minWidth: 112 }}>
          <Button compact title="Book Now" onPress={onPress} disabled={disabled} />
        </View>
      </View>
    </View>
  );
});
// Settings-style list row: tinted icon disc, title + caption, chevron.
export function MenuRow({
  title,
  subtitle,
  icon,
  onPress,
  tint = theme.brand,
  badge,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress: () => void;
  tint?: string;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 13,
        alignItems: "center",
        minHeight: 58,
        paddingVertical: 8,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <IconDisc name={icon} size={40} tint={tint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: "600" }]}>{title}</Text>
        {subtitle && <Text style={[styles.small, { fontSize: 12 }]}>{subtitle}</Text>}
      </View>
      {badge && (
        <View
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            paddingHorizontal: 6,
            backgroundColor: theme.brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 11.5, fontWeight: "800" }}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" color="#A3A9B5" size={17} />
    </Pressable>
  );
}
export const Divider = () => <View style={{ height: 1, backgroundColor: theme.line }} />;
