import { ActivityIndicator, View, Text, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../state/Providers";
import { Brand } from "./Premium";
import { theme } from "./ui";
export function Startup({ children }: React.PropsWithChildren) {
  const { ready } = useApp();
  if (ready) return <>{children}</>;
  return (
    <ImageBackground
      source={require("../../assets/journey-night.webp")}
      style={{ flex: 1 }}
      imageStyle={{ width: "100%", height: "100%" }}
    >
      <LinearGradient
        colors={[`${theme.paper}55`, `${theme.paper}22`, `${theme.paper}BB`]}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: 30,
        }}
      >
        <Brand large />
        <Text style={{ color: theme.ink, fontSize: 24 }}>
          Go Places. Your Way.
        </Text>
        <Ionicons name="car-sport-outline" size={120} color={theme.brand} />
        <Text
          style={{
            color: theme.gold,
            textAlign: "center",
            fontSize: 16,
            lineHeight: 27,
          }}
        >
          Real Vehicles. Real Drivers.{"\n"}Real Journeys.
        </Text>
        <ActivityIndicator
          color={theme.brand}
          accessibilityLabel="Restoring your session"
        />
      </LinearGradient>
    </ImageBackground>
  );
}
