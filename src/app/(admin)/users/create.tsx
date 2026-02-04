import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "../../../components";
import { UserService } from "../../../services/user.service";
import { Colors, Spacing } from "../../../theme";

export default function CreateUser() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF" | "VIEWER">("STAFF");

  const mutation = useMutation({
    mutationFn: UserService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      router.replace("/(admin)/users");
    },
  });

  const handleCreate = () => {
    mutation.mutate({
      name,
      email,
      password,
      role,
    });
  };

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: Spacing.lg,
        }}
      >
        Create User
      </Text>

      <TextInput
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.md,
        }}
      />

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.md,
        }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.md,
        }}
      />

      {/* Simple role selector */}
      <View style={{ marginBottom: Spacing.lg }}>
        <Text style={{ marginBottom: Spacing.sm }}>Role</Text>

        {["ADMIN", "STAFF", "VIEWER"].map((r) => (
          <Text
            key={r}
            onPress={() => setRole(r as "ADMIN" | "STAFF" | "VIEWER")}
            style={{
              paddingVertical: Spacing.sm,
              color: role === r ? Colors.primary : Colors.textSecondary,
              fontWeight: role === r ? "600" : "400",
            }}
          >
            {r}
          </Text>
        ))}
      </View>

      <Button
        title="Create User"
        onPress={handleCreate}
        disabled={mutation.isLoading}
      />

      {mutation.isError && (
        <Text style={{ color: Colors.error, marginTop: Spacing.md }}>
          Failed to create user
        </Text>
      )}
    </View>
  );
}
