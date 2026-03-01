import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        tabBarShowIcon: false,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: "Log entry", headerTitle: "Log entry" }}
      />
      <Tabs.Screen
        name="trends"
        options={{ title: "Trends", headerTitle: "Trends" }}
      />
    </Tabs>
  );
}
