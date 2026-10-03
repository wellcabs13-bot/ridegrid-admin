import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { styles, theme, Card, Button } from "./ui";
import { baseURL } from "../services/api";
import { label, money } from "../utils/journey";
import type { Listing } from "../types";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <View>
      <Text
        style={{
          color: theme.ink,
          fontSize: large ? 44 : 24,
          fontWeight: "900",
          letterSpacing: -1,
        }}
      >
        Ride<Text style={{ color: theme.brand }}>Grid</Text>
      </Text>
      <Text
        style={{
          color: theme.muted,
          fontSize: large ? 16 : 10,
          textAlign: "right",
        }}
      >
        by Wellcabs
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
  tone?: "cyan" | "gold" | "green";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const color =
    tone === "gold"
      ? theme.gold
      : tone === "green"
        ? theme.success
        : theme.brand;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 5,
        backgroundColor: `${color}15`,
        borderWidth: 1,
        borderColor: `${color}45`,
      }}
    >
      {icon && <Ionicons name={icon} color={color} size={14} />}
      <Text style={{ color, fontSize: 11, fontWeight: "700", flexShrink: 1 }}>
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
    <View style={{ gap: 3 }}>
      <Text
        style={{
          color: theme.brand,
          fontSize: 32,
          fontWeight: "800",
          letterSpacing: -1,
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
}: {
  title: string;
  caption?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.heading}>{title}</Text>
      {caption && <Text style={styles.small}>{caption}</Text>}
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
            height: compact ? 130 : 220,
            borderRadius: 14,
          }}
        />
      ) : (
        <LinearGradient
          colors={[theme.surface, "#17171B", theme.paper]}
          style={{
            height: compact ? 120 : 190,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons
            name="car-sport-outline"
            size={compact ? 65 : 86}
            color={theme.brand}
          />
          <Text style={styles.small}>Vehicle photo unavailable</Text>
        </LinearGradient>
      )}
      {photos.length > 1 && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {photos.slice(0, 6).map((_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Vehicle photo ${i + 1}`}
              onPress={() => setIndex(i)}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 8,
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
export function VehicleIdentity({ listing: l }: { listing: Listing }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.heading}>
        {l.vehicle.make} {l.vehicle.model}
      </Text>
      {l.vehicle.registrationNumber && (
        <Text style={styles.small}>{l.vehicle.registrationNumber}</Text>
      )}
      <Text style={styles.small}>
        {label(l.vehicle.category)} · {l.vehicle.seatingCapacity} seats ·{" "}
        {label(l.vehicle.fuelType)} · {label(l.vehicle.transmission)}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {l.marketplace?.verified && (
          <Badge
            text="Verified vehicle"
            tone="green"
            icon="shield-checkmark-outline"
          />
        )}
        {l.marketplace?.available && (
          <Badge text="Available for your dates" icon="calendar-outline" />
        )}
      </View>
      {l.vendor && (
        <View style={{ gap: 5 }}>
          <Text style={styles.body}>{l.vendor.companyName}</Text>
          {l.vendor.approved && (
            <Badge
              text="Approved vendor"
              tone="green"
              icon="shield-checkmark-outline"
            />
          )}
        </View>
      )}
      {l.driver && (
        <View style={{ gap: 5 }}>
          <Text style={styles.small}>Aligned driver · {l.driver.name}</Text>
          {l.driver.verified && (
            <Badge text="Verified driver account" tone="green" />
          )}
        </View>
      )}
      {l.ratings?.vehicle?.count && l.ratings.vehicle.average != null ? (
        <Badge
          text={`${l.ratings.vehicle.average} ★ · ${l.ratings.vehicle.count} vehicle reviews`}
          tone="gold"
        />
      ) : null}
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
      {best && (
        <Badge
          text="BEST PRICE · This search"
          tone="gold"
          icon="ribbon-outline"
        />
      )}
      <VehicleVisual
        compact
        photos={listing.media?.vehiclePhotos}
        name={`${listing.vehicle.make} ${listing.vehicle.model}`}
      />
      <View style={{ gap: 4 }}>
        <Text style={styles.heading}>
          {listing.vehicle.make} {listing.vehicle.model}
        </Text>
        <Text style={styles.small}>{listing.vehicle.registrationNumber}</Text>
        <Text style={styles.small}>
          {label(listing.vehicle.category)} · {listing.vehicle.seatingCapacity}{" "}
          seats · {label(listing.vehicle.fuelType)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {listing.marketplace?.verified && (
          <Badge text="Verified vehicle" tone="green" />
        )}
        {listing.marketplace?.available && <Badge text="Available" />}
      </View>
      <View style={{ gap: 3 }}>
        <Text style={styles.small}>
          {listing.vendor?.companyName}
          {listing.vendor?.approved ? " · Approved vendor" : ""}
        </Text>
        {listing.driver && (
          <Text style={styles.small}>
            {listing.driver.name} · Aligned driver
          </Text>
        )}
        <Text style={styles.small}>
          {listing.pricing.includedKm} km included ·{" "}
          {listing.pricing.packageName}
        </Text>
      </View>
      <PriceDisplay
        value={listing.pricing.finalPayable}
        caption="Total estimate · Full fare on next screen"
      />
      <Button title="View ride & fare" onPress={onPress} disabled={disabled} />
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
  icon: React.ComponentProps<typeof Ionicons>["name"];
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
        minHeight: 56,
        paddingVertical: 10,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Ionicons name={icon} color={theme.gold} size={22} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.body}>{title}</Text>
        {subtitle && <Text style={styles.small}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" color={theme.muted} size={17} />
    </Pressable>
  );
}
