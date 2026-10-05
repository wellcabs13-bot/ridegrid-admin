import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { styles, theme, shadow, Card, Button } from "./ui";
import { baseURL } from "../services/api";
import { label, money } from "../utils/journey";
import type { Listing } from "../types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function Brand({
  large = false,
  light = false,
}: {
  large?: boolean;
  light?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: large ? 10 : 6 }}>
      <View
        style={{
          width: large ? 44 : 30,
          height: large ? 44 : 30,
          borderRadius: large ? 14 : 10,
          backgroundColor: theme.brand,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="location" size={large ? 26 : 18} color="white" />
      </View>
      <Text
        style={{
          color: light ? "white" : theme.ink,
          fontSize: large ? 36 : 22,
          fontWeight: "900",
          letterSpacing: -1,
        }}
      >
        Ride<Text style={{ color: light ? "#FF8A8F" : theme.brand }}>Grid</Text>
      </Text>
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
          ? "#1D4ED8"
          : theme.brand;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: `${color}14`,
      }}
    >
      {icon && <Ionicons name={icon} color={color} size={13} />}
      <Text style={{ color, fontSize: 11.5, fontWeight: "700", flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}
export function PriceDisplay({
  value,
  caption = "Total for your journey",
}: {
  value: string | number | null;
  caption?: string;
}) {
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          color: theme.ink,
          fontSize: 30,
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
}: {
  title: string;
  caption?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <View style={{ gap: 3, flex: 1 }}>
        <Text style={styles.heading}>{title}</Text>
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
// Round icon inside a soft red disc — the one icon treatment used app-wide.
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
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", fontSize: size * 0.36 }}>{initials || "R"}</Text>
    </View>
  );
}
export function QuickAction({
  icon,
  title,
  onPress,
}: {
  icon: IconName;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 72,
        alignItems: "center",
        gap: 8,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
          alignItems: "center",
          justifyContent: "center",
          ...shadow,
        }}
      >
        <Ionicons name={icon} size={25} color={theme.brand} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: theme.ink, textAlign: "center" }} numberOfLines={2}>
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
          <IconDisc name={icon} size={36} />
          <Text style={{ fontSize: 11, fontWeight: "600", color: theme.muted, textAlign: "center" }}>{text}</Text>
        </View>
      ))}
    </View>
  );
}
export function VehicleVisual({
  photos = [],
  name,
  compact = false,
}: {
  photos?: string[];
  name: string;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const photo = photos[index];
  const uri = photo?.startsWith("/") ? `${baseURL}${photo}` : photo;
  return (
    <View style={{ gap: 8 }}>
      {uri && /^https?:\/\//.test(uri) && !failed.includes(uri) ? (
        <Image
          accessibilityLabel={name}
          source={{ uri }}
          resizeMode="cover"
          onError={() => setFailed((v) => [...v, uri])}
          style={{
            width: "100%",
            height: compact ? 150 : 230,
            borderRadius: 16,
            backgroundColor: theme.field,
          }}
        />
      ) : (
        <LinearGradient
          colors={["#F8F9FB", "#ECEEF3"]}
          style={{
            height: compact ? 130 : 190,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons
            name="car-sport"
            size={compact ? 62 : 84}
            color="#C9CDD6"
          />
          <Text style={styles.small}>{name}</Text>
        </LinearGradient>
      )}
      {photos.length > 1 && (
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={icon} size={14} color={theme.muted} />
      <Text style={styles.small}>{text}</Text>
    </View>
  );
}
export function Specs({ listing: l }: { listing: Listing }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 }}>
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
      <Avatar name={l.driver.name} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
          {l.driver.name}
        </Text>
        <Text style={styles.small}>Your driver</Text>
      </View>
      {l.driver.verified && <Badge text="Verified driver" tone="green" icon="shield-checkmark" />}
    </View>
  );
}
export function VendorBlock({ listing: l }: { listing: Listing }) {
  if (!l.vendor) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <IconDisc name="business-outline" size={40} tint={theme.ink} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
          {l.vendor.companyName}
        </Text>
        <Text style={styles.small}>Vendor</Text>
      </View>
      {l.vendor.approved && <Badge text="Approved vendor" tone="green" icon="shield-checkmark" />}
    </View>
  );
}
export function VehicleIdentity({ listing: l }: { listing: Listing }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 3 }}>
        <Text style={[styles.title, { fontSize: 24, lineHeight: 30 }]}>
          {l.vehicle.make} {l.vehicle.model}
        </Text>
        {l.vehicle.registrationNumber && (
          <Text style={styles.small}>{l.vehicle.registrationNumber}</Text>
        )}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {l.marketplace?.verified && (
          <Badge text="Verified vehicle" tone="green" icon="shield-checkmark" />
        )}
        {l.marketplace?.available && (
          <Badge text="Available for your dates" icon="calendar-outline" />
        )}
        {l.ratings?.vehicle?.count && l.ratings.vehicle.average != null ? (
          <Badge
            text={`${l.ratings.vehicle.average} ★ · ${l.ratings.vehicle.count} reviews`}
            tone="gold"
          />
        ) : null}
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
  return (
    <Card>
      <View>
        <VehicleVisual
          compact
          photos={listing.media?.vehiclePhotos}
          name={`${listing.vehicle.make} ${listing.vehicle.model}`}
        />
        {best && (
          <View style={{ position: "absolute", top: 10, left: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: theme.brand,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Ionicons name="ribbon" size={13} color="white" />
              <Text style={{ color: "white", fontSize: 11.5, fontWeight: "800" }}>
                Best price
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={{ gap: 3 }}>
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <Text style={[styles.heading, { flex: 1, fontSize: 19 }]}>
            {listing.vehicle.make} {listing.vehicle.model}
          </Text>
          {listing.marketplace?.verified && (
            <Ionicons name="shield-checkmark" size={20} color={theme.success} />
          )}
        </View>
        {!!listing.vehicle.registrationNumber && (
          <Text style={styles.small}>{listing.vehicle.registrationNumber}</Text>
        )}
      </View>
      <Specs listing={listing} />
      <View style={{ height: 1, backgroundColor: theme.line }} />
      <DriverBlock listing={listing} />
      <VendorBlock listing={listing} />
      <View style={{ height: 1, backgroundColor: theme.line }} />
      <View style={[styles.row, { alignItems: "flex-end" }]}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.ink,
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: -0.8,
            }}
          >
            {money(listing.pricing.finalPayable)}
          </Text>
          <Text style={styles.small}>
            Total fare · {listing.pricing.includedKm} km included
          </Text>
        </View>
        <View style={{ minWidth: 128 }}>
          <Button title="Select" icon="arrow-forward" onPress={onPress} disabled={disabled} />
        </View>
      </View>
    </Card>
  );
});
export function MenuRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress: () => void;
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
      <IconDisc name={icon} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.body, { fontWeight: "600" }]}>{title}</Text>
        {subtitle && <Text style={styles.small}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" color={theme.muted} size={17} />
    </Pressable>
  );
}
