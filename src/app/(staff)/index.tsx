import { AuthService } from "@/src/services/auth.service";
import { useAuthStore } from "@/src/stores/auth.store";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

const index = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AuthService.logout();
          clearAuth();
          router.replace("/(auth)/login");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };
  return (
    <View>
      <Pressable onPress={handleLogout}>
        <Text>Click Me</Text>
      </Pressable>
      <Text>index</Text>
    </View>
  );
};

export default index;
