import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "../admin/theme";
import ModuleSearchBar from "./ModuleSearchBar";
import ModuleStatGrid, { ModuleStatItem } from "./ModuleStatGrid";

type ModuleScreenIntroProps = {
  stats?: ModuleStatItem[];
  search?: {
    value: string;
    onChangeText: (text: string) => void;
    onClear: () => void;
    placeholder: string;
    resultText?: string;
    onFilterPress?: () => void;
    activeFilterCount?: number;
  };
  helperRow?: ReactNode;
};

export default function ModuleScreenIntro({
  stats,
  search,
  helperRow,
}: ModuleScreenIntroProps) {
  if (!stats?.length && !search && !helperRow) {
    return null;
  }

  return (
    <View style={styles.content}>
      {stats?.length ? (
        <View style={styles.statsWrap}>
          <ModuleStatGrid items={stats} />
        </View>
      ) : null}

      {search ? (
        <View style={styles.searchWrap}>
          <ModuleSearchBar
            value={search.value}
            onChangeText={search.onChangeText}
            onClear={search.onClear}
            placeholder={search.placeholder}
            onFilterPress={search.onFilterPress}
            activeFilterCount={search.activeFilterCount}
            inputContainerStyle={styles.searchInputWrap}
          />
          {search.resultText ? (
            <Text style={styles.resultText}>{search.resultText}</Text>
          ) : null}
        </View>
      ) : null}

      {helperRow ? <View style={styles.helperWrap}>{helperRow}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: AdminTheme.spacing.sm,
    gap: AdminTheme.spacing.sm,
  },
  statsWrap: {
    gap: AdminTheme.spacing.sm,
  },
  searchWrap: {
    gap: 6,
  },
  searchInputWrap: {
    flex: 1,
  },
  resultText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    paddingHorizontal: 4,
  },
  helperWrap: {
    gap: AdminTheme.spacing.sm,
  },
});
