import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button } from "../../../components";
import { ProfitService } from "../../../services/profit.service";
import { Spacing } from "../../../theme";

export default function AdminProfit() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const mutation = useMutation({
    mutationFn: ProfitService.getProfit,
  });

  const handleFetch = () => {
    if (!startDate || !endDate) return;

    mutation.mutate({
      startDate,
      endDate,
    });
  };

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Profit Report</Text>

      <TextInput
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        style={{ marginTop: Spacing.md }}
      />

      <TextInput
        placeholder="End Date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        style={{ marginTop: Spacing.md }}
      />

      <View style={{ marginTop: Spacing.md }}>
        <Button title="Get Profit" onPress={handleFetch} />
      </View>

      {mutation.isLoading && <Text>Loading...</Text>}
      {mutation.isError && <Text>Error fetching profit</Text>}

      {mutation.data && (
        <View style={{ marginTop: Spacing.lg }}>
          <Text>Total Sales: ₹ {mutation.data.totalSales}</Text>
          <Text>Total Expenses: ₹ {mutation.data.totalExpenses}</Text>
          <Text style={{ fontWeight: "600" }}>
            Profit: ₹ {mutation.data.profit}
          </Text>
        </View>
      )}
    </View>
  );
}
