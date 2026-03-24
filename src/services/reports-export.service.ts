import { api, apiPath, unwrap } from "./api";
import { ApiReportFormat, ApiReportType } from "../constants/api-enums";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiMessage, getApiPayload } from "./api-contract.service";
import { Platform } from "react-native";
import { formatReportHtml } from "../utils/report-pdf";

export interface ExportReportResponse {
  reportId: string;
  status: string;
  fileName?: string;
  message?: string;
}

export interface DownloadReportResponse {
  byteLength: number;
  fileName?: string;
  contentType?: string;
  fileUri?: string;
}

export interface StructuredReportResponse {
  reportType: string;
  metaRows: Array<{ label: string; value: string }>;
  overview: any;
  tables: {
    sales: Array<Record<string, any>>;
    payments: Array<Record<string, any>>;
    inventory: Array<Record<string, any>>;
    staff: Array<Record<string, any>>;
  };
}

export type ReportType = ApiReportType;
export type ReportFormat = ApiReportFormat;

const toByteLength = (data: any) => {
  if (typeof data?.byteLength === "number") return data.byteLength;
  if (typeof data?.length === "number") return data.length;
  return 0;
};

const toBase64 = (data: any): string => {
  if (!data) return "";
  if (typeof data === "string") return data;

  const asArrayBuffer =
    data instanceof ArrayBuffer
      ? data
      : ArrayBuffer.isView(data)
        ? data.buffer
        : data?.data instanceof ArrayBuffer
          ? data.data
          : null;

  if (!asArrayBuffer) return "";

  const bytes = new Uint8Array(asArrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  // @ts-ignore Buffer may be polyfilled in RN runtime.
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return "";
};

const buildWorkbookBase64 = async (report: StructuredReportResponse) => {
  const excelModule: any = await import("exceljs");
  const ExcelJS = excelModule?.default || excelModule;
  const workbook = new ExcelJS.Workbook();

  const addSheet = (
    name: string,
    columns: Array<{ header: string; key: string; width?: number }>,
    rows: Array<Record<string, any>>,
  ) => {
    const worksheet = workbook.addWorksheet(name);
    worksheet.columns = columns;

    rows.forEach((row) => worksheet.addRow(row));

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEAF2FB" },
    };

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5EDF6" } },
          left: { style: "thin", color: { argb: "FFE5EDF6" } },
          bottom: { style: "thin", color: { argb: "FFE5EDF6" } },
          right: { style: "thin", color: { argb: "FFE5EDF6" } },
        };
        if (rowNumber > 1) {
          cell.alignment = { vertical: "middle" };
        }
      });
    });
  };

  const metaSheet = workbook.addWorksheet("Overview");
  metaSheet.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 24 },
  ];
  metaSheet.addRows([
    ...(report.metaRows || []).map((row) => ({ metric: row.label, value: row.value })),
    { metric: "Total Sales", value: report.overview?.sales?.totalSales || 0 },
    { metric: "Total Paid", value: report.overview?.sales?.totalPaid || 0 },
    { metric: "Total Due", value: report.overview?.sales?.totalDue || 0 },
    { metric: "Profit", value: report.overview?.sales?.profit || 0 },
    { metric: "Plants Available", value: report.overview?.inventory?.totalPlantsAvailable || 0 },
    { metric: "Plants Sold", value: report.overview?.inventory?.plantsSold || 0 },
    { metric: "Customers", value: report.overview?.customers?.totalCustomers || 0 },
    { metric: "Customers With Dues", value: report.overview?.customers?.customersWithDues || 0 },
  ]);
  metaSheet.getRow(1).font = { bold: true };

  addSheet(
    "Sales",
    [
      { header: "Sale ID", key: "saleId", width: 20 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Items", key: "items", width: 12 },
      { header: "Total", key: "total", width: 14 },
      { header: "Paid", key: "paid", width: 14 },
      { header: "Due", key: "due", width: 14 },
      { header: "Status", key: "status", width: 16 },
    ],
    report.tables?.sales || [],
  );

  addSheet(
    "Payments",
    [
      { header: "Payment ID", key: "paymentId", width: 30 },
      { header: "Sale Ref", key: "sale", width: 24 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Mode", key: "mode", width: 16 },
      { header: "Status", key: "status", width: 18 },
      { header: "Date", key: "date", width: 18 },
    ],
    report.tables?.payments || [],
  );

  addSheet(
    "Inventory",
    [
      { header: "Plant Type", key: "plantType", width: 24 },
      { header: "Available", key: "available", width: 14 },
      { header: "Sold", key: "sold", width: 14 },
      { header: "Returned", key: "returned", width: 14 },
    ],
    report.tables?.inventory || [],
  );

  addSheet(
    "Staff",
    [
      { header: "Staff", key: "staff", width: 24 },
      { header: "Sales Count", key: "salesCount", width: 14 },
      { header: "Collections", key: "collections", width: 16 },
      { header: "Expenses", key: "expenses", width: 16 },
    ],
    report.tables?.staff || [],
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return toBase64(buffer);
};

const saveAndShareFile = async ({
  fileName,
  base64Content,
  mimeType,
}: {
  fileName: string;
  base64Content: string;
  mimeType: string;
}) => {
  if (!base64Content) {
    throw new Error("Unable to generate report data for download.");
  }

  const FileSystem: any = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  const base64Encoding = FileSystem.EncodingType.Base64;

  const extension = fileName.split(".").pop() || "pdf";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}pnms_${Date.now()}_${safeName || `report.${extension}`}`;

  if (!FileSystem.writeAsStringAsync || !(FileSystem.cacheDirectory || FileSystem.documentDirectory)) {
    throw new Error("File system write APIs are unavailable in this app runtime.");
  }

  await FileSystem.writeAsStringAsync(localPath, base64Content, {
    encoding: base64Encoding,
  });

  // Android: also allow direct save to Downloads when user grants folder access.
  if (Platform.OS === "android") {
    try {
      const SAF = FileSystem.StorageAccessFramework;
      const downloadsRoot = SAF.getUriForDirectoryInRoot("Download");
      const permission = await SAF.requestDirectoryPermissionsAsync(downloadsRoot);
      if (permission.granted && permission.directoryUri) {
        const androidFileName = safeName.endsWith(`.${extension}`)
          ? safeName.slice(0, -(extension.length + 1))
          : safeName;
        const targetFileUri = await SAF.createFileAsync(
          permission.directoryUri,
          androidFileName,
          mimeType
        );
        await SAF.writeAsStringAsync(targetFileUri, base64Content, {
          encoding: base64Encoding,
        });
      }
    } catch {
      // Fallback to share sheet below.
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localPath, {
      mimeType,
      dialogTitle: "Save Report",
      UTI:
        extension === "pdf"
          ? "com.adobe.pdf"
          : "org.openxmlformats.spreadsheetml.sheet",
    });
  }

  return localPath;
};

export const ReportsExportService = {
  async getStructuredReport(params: {
    reportType?: ReportType;
    nurseryId?: string;
    startDate?: string;
    endDate?: string;
    staffId?: string;
    plantTypeId?: string;
    customerId?: string;
  }): Promise<StructuredReportResponse> {
    const parsed = extractServiceParams(params) || {};
    const res = await api.get(apiPath("/reports/structured"), {
      params: withScopedParams({
        reportType: parsed.reportType,
        nurseryId: parsed.nurseryId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        staffId: parsed.staffId,
        plantTypeId: parsed.plantTypeId,
        customerId: parsed.customerId,
      }),
    });
    const root = unwrap<any>(res);
    return getApiPayload<StructuredReportResponse>(root);
  },

  async triggerExport(payload: {
    reportType?: ReportType;
    format: ReportFormat;
    nurseryId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ExportReportResponse> {
    const res = await api.post(apiPath("/reports/export"), {
      reportType: payload.reportType || "SALES",
      format: payload.format,
      nurseryId: payload.nurseryId,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });
    const root = unwrap<any>(res);
    const value = getApiPayload<any>(root);
    return {
      reportId: String(value?.reportId || value?._id || value?.id || ""),
      status: value?.status || "QUEUED",
      fileName: value?.fileName,
      message: getApiMessage(root) || value?.message,
    };
  },

  async downloadReport(reportId: string): Promise<DownloadReportResponse> {
    const response = await api.get(apiPath(`/reports/${reportId}/download`), {
      responseType: "arraybuffer",
    });
    const data = unwrap<any>(response);
    return { byteLength: toByteLength(data) };
  },

  async downloadByFormat(params: {
    format: "PDF" | "XLSX";
    reportType?: ReportType;
    nurseryId?: string;
    startDate?: string;
    endDate?: string;
    staffId?: string;
    plantTypeId?: string;
    customerId?: string;
  }): Promise<DownloadReportResponse> {
    const parsed = extractServiceParams(params) || {};
    if (params.format === "PDF") {
      const report = await this.getStructuredReport({
        reportType: parsed.reportType,
        nurseryId: parsed.nurseryId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        staffId: parsed.staffId,
        plantTypeId: parsed.plantTypeId,
        customerId: parsed.customerId,
      });

      const printPackage = "expo-print";
      const fsPackage = "expo-file-system/legacy";
      const Print = await import(printPackage);
      const FileSystem: any = await import(fsPackage);
      const html = formatReportHtml(report);
      const printed = await Print.printToFileAsync({ html });
      const fileName = `${(params.reportType || "REPORT").toLowerCase()}_dashboard.pdf`;
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const destination = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${safeFileName}`;
      await FileSystem.copyAsync({ from: printed.uri, to: destination });

      if (Platform.OS === "android") {
        try {
          const SAF = FileSystem.StorageAccessFramework;
          const downloadsRoot = SAF.getUriForDirectoryInRoot("Download");
          const permission = await SAF.requestDirectoryPermissionsAsync(downloadsRoot);
          if (permission.granted && permission.directoryUri) {
            const base64Content = await FileSystem.readAsStringAsync(destination, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const targetFileUri = await SAF.createFileAsync(
              permission.directoryUri,
              safeFileName.replace(/\.pdf$/i, ""),
              "application/pdf",
            );
            await SAF.writeAsStringAsync(targetFileUri, base64Content, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        } catch {
          // Sharing fallback below is enough.
        }
      }

      const Sharing = await import("expo-sharing");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destination, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Save Report PDF",
        });
      }

      return {
        byteLength: 0,
        fileName,
        contentType: "application/pdf",
        fileUri: destination,
      };
    }

    const report = await this.getStructuredReport({
      reportType: parsed.reportType,
      nurseryId: parsed.nurseryId,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      staffId: parsed.staffId,
      plantTypeId: parsed.plantTypeId,
      customerId: parsed.customerId,
    });
    const fileName = `${(params.reportType || "REPORT").toLowerCase()}_dashboard.xlsx`;
    const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const base64 = await buildWorkbookBase64(report);
    const fileUri = await saveAndShareFile({
      fileName,
      base64Content: base64,
      mimeType: contentType,
    });

    return {
      byteLength: Math.floor((base64.length * 3) / 4),
      fileName,
      contentType,
      fileUri,
    };
  },

  async reopenSavedFile(fileUri: string, contentType?: string) {
    if (!fileUri) {
    throw new Error("No exported report file found.");
  }

  const FileSystem: any = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  if (!FileSystem.getInfoAsync) {
    throw new Error("File system read APIs are unavailable in this app runtime.");
  }
  const info = await FileSystem.getInfoAsync(fileUri);
    if (!info?.exists) {
      throw new Error("Exported file is not available on this device anymore.");
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }

    const extension = fileUri.split(".").pop()?.toLowerCase();
    await Sharing.shareAsync(fileUri, {
      mimeType: contentType,
      dialogTitle: "Open Report",
      UTI:
        extension === "pdf"
          ? "com.adobe.pdf"
          : "org.openxmlformats.spreadsheetml.sheet",
    });
  },
};
