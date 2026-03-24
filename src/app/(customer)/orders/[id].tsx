import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import {
  CustomerCard,
  CustomerScreen,
  SectionHeader,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import { CustomerColors, Spacing } from "@/src/theme";

const TRACKING_STEPS = [
  { key: "confirmed", title: "Order confirmed", caption: "Your request has been received.", done: true },
  { key: "packed", title: "Packed at nursery", caption: "Plants and materials are being prepared.", done: true },
  { key: "shipped", title: "On the way", caption: "The nursery team has dispatched this order.", done: true },
  { key: "delivered", title: "Delivered", caption: "Final delivery confirmation is pending.", done: false },
];

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <CustomerScreen
      title="Order Tracking"
      subtitle={`Order #${id || "preview"}`}
      onBackPress={() => router.back()}
      footer={
        <CustomerActionButton
          label="Back to Home"
          onPress={() => router.push("/(customer)")}
          icon={<MaterialIcons name="arrow-forward" size={18} color={CustomerColors.white} />}
        />
      }
    >
      <CustomerCard style={styles.summaryCard}>
        <SectionHeader
          title="Delivery status"
          subtitle="Track the current stage of your nursery order."
          trailing={<StatusChip label="On Schedule" tone="success" />}
        />
        <View style={styles.summaryMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Estimated arrival</Text>
            <Text style={styles.metricValue}>Today, 6:30 PM</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Delivery mode</Text>
            <Text style={styles.metricValue}>Nursery dispatch</Text>
          </View>
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Journey"
          subtitle="Each update appears here as the order moves through the nursery workflow."
        />
        <View style={styles.timeline}>
          {TRACKING_STEPS.map((step, index) => {
            const isLast = index === TRACKING_STEPS.length - 1;

            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepDot, step.done ? styles.stepDotDone : styles.stepDotPending]}>
                    {step.done ? (
                      <MaterialIcons name="check" size={12} color={CustomerColors.white} />
                    ) : (
                      <MaterialIcons name="schedule" size={12} color={CustomerColors.textMuted} />
                    )}
                  </View>
                  {!isLast ? <View style={styles.stepLine} /> : null}
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <StatusChip label={step.done ? "Done" : "Pending"} tone={step.done ? "success" : "default"} />
                  </View>
                  <Text style={styles.stepCaption}>{step.caption}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: Spacing.md,
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  metric: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.06)",
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  timeline: {
    marginTop: Spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  stepRail: {
    width: 22,
    alignItems: "center",
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: CustomerColors.primary,
  },
  stepDotPending: {
    backgroundColor: "rgba(15,189,73,0.08)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 6,
    backgroundColor: CustomerColors.border,
  },
  stepBody: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: 6,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  stepCaption: {
    color: CustomerColors.textMuted,
    lineHeight: 20,
  },
});
