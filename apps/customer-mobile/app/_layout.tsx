import { Startup } from "../src/components/Startup";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Providers } from "../src/state/Providers";
import { JourneyProvider } from "../src/state/Journey";
import { theme } from "../src/components/ui";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <Startup>
          <JourneyProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerTitle: "RideGrid",
                headerShadowVisible: false,
                headerStyle: { backgroundColor: theme.paper },
                headerTintColor: theme.ink,
                headerBackTitle: "Back",
                contentStyle: { backgroundColor: theme.paper },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: "Your account" }} />
              <Stack.Screen
                name="results"
                options={{ title: "Available rides" }}
              />
              <Stack.Screen name="listing" options={{ title: "Your ride" }} />
              <Stack.Screen
                name="checkout"
                options={{ title: "Booking details" }}
              />
              <Stack.Screen
                name="payment"
                options={{ title: "Review & confirm" }}
              />
              <Stack.Screen
                name="bookings/[id]"
                options={{ title: "Your booking" }}
              />
            </Stack>
          </JourneyProvider>
        </Startup>
      </Providers>
    </SafeAreaProvider>
  );
}
