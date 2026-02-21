import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SalesService } from "../../services/sales.service";
import { Colors, Spacing } from "../../theme";
import {
  buildBillDataFromSale,
  formatBillHtml,
  formatBillShareText,
} from "../../utils/billing";
import { ErrorView } from "../ui/ErrorView";
import { Loader } from "../ui/Loader";

type RouteGroup = "staff" | "admin" | "viewer";

interface SaleBillScreenProps {
  id?: string;
  routeGroup: RouteGroup;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function SaleBillScreen({ id, routeGroup }: SaleBillScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => SalesService.getById(id || ""),
    enabled: !!id,
  });

  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const onOpenSale = () => {
    if (!id) return;
    router.push(`/(${routeGroup})/sales/${id}` as any);
  };

  const onShareBill = async () => {
    if (!data) return;
    const bill = buildBillDataFromSale(data);
    const message = formatBillShareText(bill);
    await Share.share({ message, title: bill.billNumber });
  };

  const onSavePdf = async () => {
    if (!data) return;
    try {
      const printPackage = "expo-print";
      const fsPackage = "expo-file-system/legacy";
      const Print = await import(printPackage);
      const FileSystem = await import(fsPackage);
      const bill = buildBillDataFromSale(data);
      const html = formatBillHtml(bill);
      const printed = await Print.printToFileAsync({ html });
      const safeFileName = bill.billNumber.replace(/[^a-zA-Z0-9-_]/g, "_");

      if (Platform.OS === "android") {
        const SAF = FileSystem.StorageAccessFramework;
        const downloadsRoot = SAF.getUriForDirectoryInRoot("Download");
        const permission = await SAF.requestDirectoryPermissionsAsync(
          downloadsRoot,
        );

        if (!permission.granted || !permission.directoryUri) {
          Alert.alert(
            "Permission Required",
            "Allow folder access and select Downloads to save bill PDFs.",
          );
          return;
        }

        const targetFileUri = await SAF.createFileAsync(
          permission.directoryUri,
          safeFileName,
          "application/pdf",
        );

        const base64Content = await FileSystem.readAsStringAsync(printed.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await SAF.writeAsStringAsync(targetFileUri, base64Content, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert(
          "PDF Saved",
          `Saved to Downloads/${safeFileName}.pdf`,
        );
        return;
      }

      const appFolderName = "PNMS";
      const appFolderUri = `${FileSystem.documentDirectory}${appFolderName}/`;
      await FileSystem.makeDirectoryAsync(appFolderUri, { intermediates: true });
      const destination = `${appFolderUri}${safeFileName}.pdf`;
      await FileSystem.copyAsync({ from: printed.uri, to: destination });

      const sharingPackage = "expo-sharing";
      const Sharing = await import(sharingPackage);
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(destination, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Save Bill PDF",
        });
      } else {
        await Share.share({
          url: destination,
          title: `${safeFileName}.pdf`,
          message: "Use Save to Files to store this PDF on your device.",
        });
      }

      Alert.alert(
        "PDF Export Opened",
        "Choose 'Save to Files' and select your preferred location.",
      );
    } catch (err: any) {
      Alert.alert(
        "Unable to Save PDF",
        err?.message || "PDF generation requires expo-print support.",
      );
    }
  };

  if (isLoading) {
    return <Loader centered color={Colors.primary} />;
  }

  if (error || !data) {
    return (
      <View style={styles.errorContainer}>
        <ErrorView message="Unable to generate bill. Please try again." />
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bill = buildBillDataFromSale(data);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Customer Bill
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onSavePdf} style={styles.iconButton}>
              <MaterialIcons name="picture-as-pdf" size={20} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShareBill} style={styles.iconButton}>
              <MaterialIcons name="share" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.billCard}>
          <View style={[styles.invoiceHeader, isCompact && styles.invoiceHeaderCompact]}>
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>PNMS</Text>
              <Text style={styles.companySub}>Plant Nursery Management System</Text>
              <Text style={styles.companySub}>Nursery Operations & Sales</Text>
            </View>
            <View style={[styles.invoiceMeta, isCompact && styles.invoiceMetaCompact]}>
              <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
              <Text style={styles.invoiceMetaText}>No: {bill.billNumber}</Text>
              <Text style={styles.invoiceMetaText}>
                Date: {new Date(bill.issuedAt).toLocaleDateString("en-IN")}
              </Text>
              <Text style={styles.invoiceMetaText}>
                Due: {new Date(bill.dueDate).toLocaleDateString("en-IN")}
              </Text>
            </View>
          </View>

          <View style={[styles.infoGrid, isCompact && styles.infoGridCompact]}>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Bill To</Text>
              <Text style={styles.infoName}>{bill.customerName}</Text>
              <Text style={styles.metaText}>
                Phone: {bill.customerPhone || "N/A"}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Bill Details</Text>
              <Text style={styles.metaText}>Sale Ref: {bill.saleId}</Text>
              <Text style={styles.metaText}>Payment: {bill.paymentMode}</Text>
              <Text style={styles.metaText}>Handled By: {bill.sellerName}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Line Items</Text>
          {bill.items.map((line, idx) => (
            <View key={`${line.id}-${idx}`} style={styles.lineRow}>
              <View style={styles.lineLeft}>
                <Text style={styles.lineName}>{line.name}</Text>
                <Text style={styles.lineQty}>Category: {line.category}</Text>
                <Text style={styles.lineQty}>
                  Qty {line.quantity} x {formatCurrency(line.unitPrice)}
                </Text>
              </View>
              <Text style={styles.lineTotal}>{formatCurrency(line.lineTotal)}</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.summaryBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Units</Text>
              <Text style={styles.totalValue}>{bill.totalUnits}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(bill.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(bill.discountAmount)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({bill.taxPercent}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(bill.taxAmount)}</Text>
            </View>
            <View style={styles.totalRowGrand}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(bill.grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onOpenSale} style={styles.secondaryButton}>
          <MaterialIcons name="receipt-long" size={18} color={Colors.primary} />
          <Text style={styles.secondaryButtonText}>Open Sale Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: "700" as const,
    flex: 1,
    textAlign: "center" as const,
    marginHorizontal: Spacing.sm,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  billCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  invoiceHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },
  invoiceHeaderCompact: {
    flexDirection: "column" as const,
  },
  companyBlock: {
    flex: 1,
    minWidth: 0,
  },
  companyName: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: 0.4,
  },
  companySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  invoiceMeta: {
    alignItems: "flex-end" as const,
    maxWidth: "55%",
  },
  invoiceMetaCompact: {
    alignItems: "flex-start" as const,
    maxWidth: "100%",
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  invoiceMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  infoGrid: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoGridCompact: {
    flexDirection: "column" as const,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
  },
  infoBoxTitle: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: "700" as const,
  },
  infoName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  billNo: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  sectionTitle: {
    marginTop: Spacing.xs,
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  lineRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: Spacing.sm,
  },
  lineLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  lineName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  lineQty: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 4,
  },
  summaryBox: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
  },
  totalRowGrand: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  secondaryButton: {
    marginTop: Spacing.lg,
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: "600" as const,
  },
};
