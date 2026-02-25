import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";
import { ActivityIndicator, View } from "react-native";
// lucide-react-native icons
import { LayoutDashboard, Wrench, Car, Zap, ArrowLeftRight } from "lucide-react-native";

export default function AppLayout() {
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/(auth)/login");
    }
  }, [token, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!token) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="builds/index"
        options={{
          title: "Builds",
          tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="vehicles/index"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color, size }) => <Car color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="engines/index"
        options={{
          title: "Engines",
          tabBarIcon: ({ color, size }) => <Zap color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transmissions/index"
        options={{
          title: "Trans.",
          tabBarIcon: ({ color, size }) => (
            <ArrowLeftRight color={color} size={size} />
          ),
        }}
      />
      {/* Hide build detail from tab bar */}
      <Tabs.Screen
        name="builds/[buildId]/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="builds/new"
        options={{ href: null }}
      />
    </Tabs>
  );
}
