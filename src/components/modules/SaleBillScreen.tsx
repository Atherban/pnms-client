import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomerActionButton } from "../customer/CustomerActionButton";
import { CustomerScreen } from "../common/StitchScreen";
import { NurseryPublicProfileService } from "../../services/nursery-public-profile.service";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import {
  buildBillDataFromSaleAsync,
  buildBillDataFromSale,
  formatBillHtml,
  formatBillShareText,
} from "../../utils/billing";
import { ErrorView } from "../ui/ErrorView";
import { Loader } from "../ui/Loader";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";

type RouteGroup = "staff" | "admin" | "customer";

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
  const userNurseryId = useAuthStore((state) => state.user?.nurseryId);
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => SalesService.getById(id || ""),
    enabled: !!id,
  });

  const saleNurseryId = (() => {
    if (!data?.nurseryId) return userNurseryId;
    if (typeof data.nurseryId === "string") return data.nurseryId;
    return data.nurseryId._id || data.nurseryId.id || userNurseryId;
  })();

  const { data: nurseryProfile } = useQuery({
    queryKey: ["nursery-public-profile", saleNurseryId],
    enabled: !!saleNurseryId,
    queryFn: () => NurseryPublicProfileService.get(saleNurseryId),
  });

  const { data: billData, isLoading: billLoading } = useQuery({
    queryKey: [
      "sale-bill-data",
      id,
      data?.updatedAt,
      nurseryProfile?.updatedAt,
      nurseryProfile?.logoImageUrl,
    ],
    enabled: !!data,
    queryFn: () => buildBillDataFromSaleAsync(data!, { nurseryProfile }),
  });

  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const onOpenSale = () => {
    if (!id) return;
    if (routeGroup === "customer") {
      router.push(`/(customer)/dues/${id}` as any);
      return;
    }
    router.push(`/(${routeGroup})/sales/${id}` as any);
  };

  const onShareBill = async () => {
    if (!data) return;
    try {
      const printPackage = "expo-print";
      const fsPackage = "expo-file-system/legacy";
      const sharingPackage = "expo-sharing";
      const Print = await import(printPackage);
      const FileSystem = await import(fsPackage);
      const Sharing = await import(sharingPackage);
      const bill = await buildBillDataFromSaleAsync(data, { nurseryProfile });
      const html = formatBillHtml(bill);
      const printed = await Print.printToFileAsync({ html });
      const safeFileName = bill.billNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
      const destination = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${safeFileName}.pdf`;
      await FileSystem.copyAsync({ from: printed.uri, to: destination });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destination, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Share Bill PDF",
        });
        return;
      }

      await Share.share({
        url: destination,
        title: `${safeFileName}.pdf`,
        message: formatBillShareText(bill),
      });
    } catch (err: any) {
      Alert.alert(
        "Unable to Share PDF",
        err?.message || "PDF generation requires expo-print support.",
      );
    }
  };

  const onSavePdf = async () => {
    if (!data) return;
    try {
      const printPackage = "expo-print";
      const fsPackage = "expo-file-system/legacy";
      const Print = await import(printPackage);
      const FileSystem = await import(fsPackage);
      const bill = await buildBillDataFromSaleAsync(data, { nurseryProfile });
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

  if (isLoading || billLoading) {
    return <Loader centered color={AdminTheme.colors.primary} />;
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

  const bill = billData || buildBillDataFromSale(data, { nurseryProfile });

  if (routeGroup === "customer") {
    return (
      <CustomerScreen
        title="Invoice"
        subtitle={bill.billNumber}
        onBackPress={onBack}
        actions={
          <View style={styles.customerHeaderActions}>
            <Pressable onPress={onShareBill} style={styles.customerHeaderIcon}>
              <MaterialIcons name="share" size={20} color={AdminTheme.colors.surface} />
            </Pressable>
          </View>
        }
        footer={
          <View style={styles.customerFooter}>
            <CustomerActionButton
              label="Download Invoice"
              onPress={onSavePdf}
              icon={<MaterialIcons name="download" size={18} color={AdminTheme.colors.surface} />}
            />
          </View>
        }
      >
        <View style={styles.customerBody}>
          <View style={styles.billCard}>
            <View style={[styles.invoiceHeader, isCompact ? styles.invoiceHeaderCompact : undefined]}>
              <View style={styles.companyBlock}>
                {bill.nursery.logoBase64 || bill.nursery.logoImageUrl ? (
                  <Image
                    source={{ uri: bill.nursery.logoBase64 || bill.nursery.logoImageUrl }}
                    style={styles.companyLogo}
                    contentFit="contain"
                  />
                ) : null}
                <Text style={styles.companyName}>{bill.nursery.name}</Text>
                {bill.nursery.address ? (
                  <Text style={styles.companySub}>{bill.nursery.address}</Text>
                ) : null}
                {bill.nursery.phoneNumber ? (
                  <Text style={styles.companySub}>Phone: {bill.nursery.phoneNumber}</Text>
                ) : null}
              </View>
              <View style={[styles.invoiceMeta, isCompact ? styles.invoiceMetaCompact : undefined]}>
                <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
                <Text style={styles.invoiceMetaText}>No: {bill.billNumber}</Text>
                <Text style={styles.invoiceMetaText}>Sale: {bill.saleNumber}</Text>
                <Text style={styles.invoiceMetaText}>
                  Date: {new Date(bill.issuedAt).toLocaleDateString("en-IN")}
                </Text>
                {bill.dueDate ? (
                  <Text style={styles.invoiceMetaText}>
                    Due: {new Date(bill.dueDate).toLocaleDateString("en-IN")}
                  </Text>
                ) : null}
                <Text style={styles.invoiceMetaText}>Status: {bill.paymentStatus}</Text>
              </View>
            </View>

            <View style={[styles.infoGrid, isCompact && styles.infoGridCompact]}>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>Bill To</Text>
                <Text style={styles.infoName}>{bill.customerName}</Text>
                <Text style={styles.metaText}>Phone: {bill.customerPhone || "N/A"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>Bill Details</Text>
                <Text style={styles.metaText}>Payment: {bill.paymentMode}</Text>
                <Text style={styles.metaText}>Handled By: {bill.sellerName}</Text>
                {bill.nursery.upiId ? <Text style={styles.metaText}>UPI: {bill.nursery.upiId}</Text> : null}
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
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(bill.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>{formatCurrency(bill.discountAmount)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Net Amount</Text>
                <Text style={styles.totalValue}>{formatCurrency(bill.netAmount)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid Amount</Text>
                <Text style={styles.totalValue}>{formatCurrency(bill.paidAmount)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Due Amount</Text>
                <Text
                  style={[
                    styles.totalValue,
                    { color: bill.dueAmount > 0 ? AdminTheme.colors.danger : AdminTheme.colors.success },
                  ]}
                >
                  {formatCurrency(bill.dueAmount)}
                </Text>
              </View>
              <View style={styles.totalRowGrand}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(bill.grandTotal)}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Payment Entries</Text>
            {bill.payments.length === 0 ? (
              <Text style={styles.metaText}>No payment entries recorded yet.</Text>
            ) : (
              bill.payments.map((payment) => (
                <View key={payment.id} style={styles.paymentEntryRow}>
                  <View style={styles.lineLeft}>
                    <Text style={styles.lineName}>{formatCurrency(payment.amount)}</Text>
                    <Text style={styles.lineQty}>
                      {payment.mode} • {payment.status}
                    </Text>
                    {payment.reference ? <Text style={styles.lineQty}>Ref: {payment.reference}</Text> : null}
                  </View>
                  <Text style={styles.lineTotal}>
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-IN") : "—"}
                  </Text>
                </View>
              ))
            )}
          </View>

          <CustomerActionButton
            label="Open Payment Details"
            variant="secondary"
            onPress={onOpenSale}
            icon={<MaterialIcons name="receipt-long" size={18} color={AdminTheme.colors.text} />}
          />
        </View>
      </CustomerScreen>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Customer Bill"
        subtitle="Invoice and nursery details"
        variant="gradient"
        showBackButton
        onBackPress={onBack}
        actions={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onSavePdf} style={styles.iconButton}>
              <MaterialIcons name="picture-as-pdf" size={20} color={AdminTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShareBill} style={styles.iconButton}>
              <MaterialIcons name="share" size={20} color={AdminTheme.colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + insets.bottom + AdminTheme.spacing.xl },
        ]}
      >
        <View style={styles.billCard}>
          <View style={[styles.invoiceHeader, isCompact ? styles.invoiceHeaderCompact : undefined]}>
            <View style={styles.companyBlock}>
              {bill.nursery.logoBase64 || bill.nursery.logoImageUrl ? (
                <Image
                  source={{ uri: bill.nursery.logoBase64 || bill.nursery.logoImageUrl }}
                  style={styles.companyLogo}
                  contentFit="contain"
                />
              ) : null}
              <Text style={styles.companyName}>{bill.nursery.name}</Text>
              {bill.nursery.code ? (
                <Text style={styles.companySub}>Code: {bill.nursery.code}</Text>
              ) : null}
              {bill.nursery.address ? (
                <Text style={styles.companySub}>{bill.nursery.address}</Text>
              ) : null}
              {bill.nursery.phoneNumber ? (
                <Text style={styles.companySub}>Phone: {bill.nursery.phoneNumber}</Text>
              ) : null}
              {bill.nursery.email ? (
                <Text style={styles.companySub}>Email: {bill.nursery.email}</Text>
              ) : null}
            </View>
            <View style={[styles.invoiceMeta, isCompact ? styles.invoiceMetaCompact : undefined]}>
              <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
              <Text style={styles.invoiceMetaText}>No: {bill.billNumber}</Text>
              <Text style={styles.invoiceMetaText}>Sale: {bill.saleNumber}</Text>
              <Text style={styles.invoiceMetaText}>
                Date: {new Date(bill.issuedAt).toLocaleDateString("en-IN")}
              </Text>
              {bill.dueDate ? (
                <Text style={styles.invoiceMetaText}>
                  Due: {new Date(bill.dueDate).toLocaleDateString("en-IN")}
                </Text>
              ) : null}
              <Text style={styles.invoiceMetaText}>Status: {bill.paymentStatus}</Text>
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
              <Text style={styles.metaText}>Payment: {bill.paymentMode}</Text>
              <Text style={styles.metaText}>Handled By: {bill.sellerName}</Text>
              {bill.nursery.upiId ? (
                <Text style={styles.metaText}>UPI: {bill.nursery.upiId}</Text>
              ) : null}
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
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Net Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(bill.netAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(bill.paidAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Due Amount</Text>
              <Text
                style={[
                  styles.totalValue,
                  { color: bill.dueAmount > 0 ? AdminTheme.colors.danger : AdminTheme.colors.success },
                ]}
              >
                {formatCurrency(bill.dueAmount)}
              </Text>
            </View>
            <View style={styles.totalRowGrand}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(bill.grandTotal)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Payment Entries</Text>
          {bill.payments.length === 0 ? (
            <Text style={styles.metaText}>No payment entries recorded yet.</Text>
          ) : (
            bill.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentEntryRow}>
                <View style={styles.lineLeft}>
                  <Text style={styles.lineName}>{formatCurrency(payment.amount)}</Text>
                  <Text style={styles.lineQty}>
                    {payment.mode} • {payment.status}
                  </Text>
                  {payment.reference ? (
                    <Text style={styles.lineQty}>Ref: {payment.reference}</Text>
                  ) : null}
                </View>
                <Text style={styles.lineTotal}>
                  {payment.paidAt
                    ? new Date(payment.paidAt).toLocaleDateString("en-IN")
                    : "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity onPress={onOpenSale} style={styles.secondaryButton}>
          <MaterialIcons name="receipt-long" size={18} color={AdminTheme.colors.primary} />
          <Text style={styles.secondaryButtonText}>Open Sale Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardSurface = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  ...AdminTheme.shadow.card,
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  customerHeaderActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  customerHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(157, 199, 171, 0.63)",
    backgroundColor: "rgba(144, 197, 162, 0.17)",
  },
  customerFooter: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
  },
  customerBody: {
    gap: AdminTheme.spacing.md,
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
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.lg,
  },
  billCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.xs,
  },
  invoiceHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: AdminTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
    paddingBottom: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.md,
  },
  invoiceHeaderCompact: {
    flexDirection: "column" as const,
  },
  companyBlock: {
    flex: 1,
    minWidth: 0,
  },
  companyLogo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.background,
    marginBottom: AdminTheme.spacing.sm,
  },
  companyName: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: AdminTheme.colors.text,
    letterSpacing: 0.4,
  },
  companySub: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    marginTop: 2,
  },
  invoiceMeta: {
    alignItems: "flex-end" as const,
    maxWidth: "55%" as const,
  },
  invoiceMetaCompact: {
    alignItems: "flex-start" as const,
    maxWidth: "100%" as const,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: AdminTheme.colors.text,
    marginBottom: 4,
  },
  invoiceMetaText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    flexShrink: 1,
  },
  infoGrid: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.sm,
  },
  infoGridCompact: {
    flexDirection: "column" as const,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 10,
    padding: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.background,
  },
  infoBoxTitle: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    color: AdminTheme.colors.textMuted,
    marginBottom: 6,
    fontWeight: "700" as const,
  },
  infoName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: 2,
  },
  billNo: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: 6,
  },
  sectionTitle: {
    marginTop: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.sm,
    fontSize: 12,
    fontWeight: "700" as const,
    color: AdminTheme.colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  metaText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
    marginVertical: AdminTheme.spacing.sm,
  },
  lineRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: AdminTheme.spacing.sm,
  },
  lineLeft: {
    flex: 1,
    paddingRight: AdminTheme.spacing.md,
  },
  lineName: {
    fontSize: 14,
    color: AdminTheme.colors.text,
    fontWeight: "600" as const,
  },
  lineQty: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  paymentEntryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: AdminTheme.spacing.sm,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 10,
    padding: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.background,
  },
  totalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 4,
  },
  summaryBox: {
    marginTop: AdminTheme.spacing.xs,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 10,
    padding: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.background,
  },
  totalRowGrand: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
  },
  totalLabel: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
  },
  totalValue: {
    fontSize: 14,
    color: AdminTheme.colors.text,
    fontWeight: "600" as const,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: AdminTheme.colors.primary,
  },
  secondaryButton: {
    marginTop: AdminTheme.spacing.lg,
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.primary + "30",
    borderRadius: 12,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
  },
  secondaryButtonText: {
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: AdminTheme.spacing.md,
  },
  retryButton: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontWeight: "600" as const,
  },
};
