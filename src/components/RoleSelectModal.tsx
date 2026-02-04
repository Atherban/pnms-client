import { Modal, Pressable, Text, View } from "react-native";
import { User } from "../services/user.service";
import { Colors, Spacing } from "../theme";

interface Props {
  visible: boolean;
  currentRole: User["role"];
  onSelect: (role: User["role"]) => void;
  onClose: () => void;
}

const ROLES: User["role"][] = ["ADMIN", "STAFF", "VIEWER"];

export function RoleSelectModal({
  visible,
  currentRole,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: Spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.surface,
            borderRadius: 8,
            padding: Spacing.lg,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: Spacing.md }}>
            Change Role
          </Text>

          {ROLES.map((role) => (
            <Pressable
              key={role}
              onPress={() => onSelect(role)}
              style={{ paddingVertical: Spacing.sm }}
            >
              <Text
                style={{
                  color:
                    role === currentRole ? Colors.primary : Colors.textPrimary,
                  fontWeight: role === currentRole ? "600" : "400",
                }}
              >
                {role}
              </Text>
            </Pressable>
          ))}

          <Pressable onPress={onClose} style={{ marginTop: Spacing.md }}>
            <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
