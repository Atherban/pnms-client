import { Modal, Pressable, Text, View } from "react-native";
import { Colors, Spacing } from "../theme";

interface Props {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export function UserFilterModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: Spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFF",
            borderRadius: 8,
            padding: Spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: Spacing.md,
            }}
          >
            {title}
          </Text>

          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
              style={{
                paddingVertical: Spacing.sm,
              }}
            >
              <Text
                style={{
                  fontWeight: opt === selected ? "600" : "400",
                  color: opt === selected ? Colors.primary : Colors.textPrimary,
                }}
              >
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
