import { Modal, Pressable, Text, View } from "react-native";
import { Colors, Spacing } from "../theme";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
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
          <Text style={{ fontWeight: "600", marginBottom: Spacing.sm }}>
            {title}
          </Text>

          <Text style={{ marginBottom: Spacing.lg }}>{message}</Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: Spacing.md,
            }}
          >
            <Pressable onPress={onCancel}>
              <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
            </Pressable>

            <Pressable onPress={onConfirm}>
              <Text style={{ color: Colors.error, fontWeight: "600" }}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
