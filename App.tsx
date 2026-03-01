import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LogEntryScreen from "./src/screens/LogEntryScreen";
import TrendsScreen from "./src/screens/TrendsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerTitleAlign: "center",
          }}
        >
          <Tab.Screen name="Log entry" component={LogEntryScreen} />
          <Tab.Screen name="Trends" component={TrendsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}