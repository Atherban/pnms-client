import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { AdminTheme } from "../admin/theme";
import StitchInput from "./StitchInput";

type ModuleSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder: string;
  onFilterPress?: () => void;
  activeFilterCount?: number;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
};

export default function ModuleSearchBar({
  value,
  onChangeText,
  onClear,
  placeholder,
  onFilterPress,
  activeFilterCount = 0,
  containerStyle,
  inputContainerStyle,
}: ModuleSearchBarProps) {
  const hasFilters = activeFilterCount > 0;

  return (
    <View style={[styles.row, containerStyle]}>
      <StitchInput
        containerStyle={[styles.inputWrap, inputContainerStyle]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        icon={
          <MaterialIcons
            name="search"
            size={18}
            color={AdminTheme.colors.textMuted}
          />
        }
        right={
          value.length > 0 ? (
            <Pressable onPress={onClear} style={styles.clearButton}>
              <MaterialIcons
                name="close"
                size={16}
                color={AdminTheme.colors.textMuted}
              />
            </Pressable>
          ) : null
        }
      />
      {onFilterPress ? (
        <Pressable
          onPress={onFilterPress}
          style={({ pressed }) => [
            styles.filterButton,
            hasFilters && styles.filterButtonActive,
            pressed && styles.filterButtonPressed,
          ]}
        >
          <MaterialIcons
            name="tune"
            size={20}
            color={
              hasFilters
                ? AdminTheme.colors.primary
                : AdminTheme.colors.textMuted
            }
          />
          {hasFilters ? (
            <View style={styles.filterBadge}>
              <MaterialIcons
                name="fiber-manual-record"
                size={8}
                color={AdminTheme.colors.primary}
              />
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
  },
  inputWrap: {
    flex: 1,
  },
  clearButton: {
    padding: 2,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AdminTheme.colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.14)",
  },
  filterButtonActive: {
    borderColor: AdminTheme.colors.primary,
    backgroundColor: "#DCFCE7",
  },
  filterButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  filterBadge: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});
