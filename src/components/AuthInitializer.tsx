// components/AuthInitializer.tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { Colors } from "../theme";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      await loadFromStorage();
      setInitialized(true);
    };

    initializeAuth();
  }, []);

  if (!initialized || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}
