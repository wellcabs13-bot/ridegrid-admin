import { ActivityIndicator, View, Text, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../state/Providers";
import { Brand } from "./Premium";
import { theme } from "./ui";
export function Startup({ children }: React.PropsWithChildren) {
  const { ready } = useApp();
  if (ready) return <>{children}</>;
  return (
    <ImageBackground
      source={require("../../assets/journey-night.webp")}
      style={{ flex: 1, backgroundColor: "#0A0F1C" }}
      imageStyle={{ width: "100%", height: "100%" }}
    >
      <LinearGradient
        colors={["#0A0F1CCC", "#0A0F1C66", "#0A0F1CF2"]}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 120,
          paddingBottom: 90,
          paddingHorizontal: 30,
        }}
      >
        <Brand large light tagline />
        <View style={{ alignItems: "center", gap: 18 }}>
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontSize: 26,
              fontWeight: "800",
              lineHeight: 32,
              letterSpacing: -0.6,
            }}
          >
            Your Next Ride{"\n"}Is a Better Ride
          </Text>
          <ActivityIndicator
            color={theme.brand}
            accessibilityLabel="Restoring your session"
          />
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}
