import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { ReportService } from "../../../services/reports.service";
import { Colors, Spacing } from "../../../theme";

export default function AdminReports() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: ReportService.getOverview,
  });

  if (!data) return null;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: Spacing.lg,
      }}
    >
      {/* SALES OVER TIME */}
      <Section title="Sales Over Time">
        {Object.entries(data.salesByDate).map(([date, amount]) => (
          <Row key={date} label={date} value={`₹ ${amount.toLocaleString()}`} />
        ))}
      </Section>

      {/* TOP SELLING PLANTS */}
      <Section title="Sales by Plant Type">
        {Object.entries(data.salesByPlant).map(([plant, amount]) => (
          <Row
            key={plant}
            label={plant}
            value={`₹ ${amount.toLocaleString()}`}
          />
        ))}
      </Section>

      {/* PAYMENT MODES */}
      <Section title="Payment Split">
        {Object.entries(data.paymentSplit).map(([mode, amount]) => (
          <Row key={mode} label={mode} value={`₹ ${amount.toLocaleString()}`} />
        ))}
      </Section>

      {/* INVENTORY */}
      <Section title="Inventory Health">
        <Row label="Total Inventory Items" value={data.inventoryCount} />
        <Row label="Low Stock (≤10)" value={data.lowStock} danger />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: 16,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: Spacing.md,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  danger,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <Text>{label}</Text>
      <Text
        style={{
          fontWeight: "700",
          color: danger ? Colors.error : Colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
