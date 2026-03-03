import { api, apiPath, unwrap } from "./api";
import { ApiReportFormat, ApiReportType } from "../constants/api-enums";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiMessage, getApiPayload } from "./api-contract.service";
import { Platform } from "react-native";

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

  const fileSystemModule: any = await import("expo-file-system/legacy");
  const FileSystem: any = fileSystemModule?.default || fileSystemModule;
  const writeAsStringAsync =
    FileSystem?.writeAsStringAsync ||
    FileSystem?.default?.writeAsStringAsync ||
    fileSystemModule?.writeAsStringAsync;
  const getInfoAsync =
    FileSystem?.getInfoAsync ||
    FileSystem?.default?.getInfoAsync ||
    fileSystemModule?.getInfoAsync;
  const cacheDirectory =
    FileSystem?.cacheDirectory ||
    FileSystem?.default?.cacheDirectory ||
    fileSystemModule?.cacheDirectory;
  const storageAccessFramework =
    FileSystem?.StorageAccessFramework ||
    FileSystem?.default?.StorageAccessFramework ||
    fileSystemModule?.StorageAccessFramework;
  const Sharing = await import("expo-sharing");
  const base64Encoding =
    FileSystem?.EncodingType?.Base64 ||
    FileSystem?.EncodingType?.base64 ||
    FileSystem?.default?.EncodingType?.Base64 ||
    FileSystem?.default?.EncodingType?.base64 ||
    "base64";

  const extension = fileName.split(".").pop() || "pdf";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localPath = `${cacheDirectory || ""}pnms_${Date.now()}_${safeName || `report.${extension}`}`;

  if (!writeAsStringAsync || !getInfoAsync || !cacheDirectory) {
    throw new Error("File system write APIs are unavailable in this app runtime.");
  }

  await writeAsStringAsync(localPath, base64Content, {
    encoding: base64Encoding,
  });

  // Android: also allow direct save to Downloads when user grants folder access.
  if (Platform.OS === "android") {
    try {
      const SAF = storageAccessFramework;
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
    const endpoint = params.format === "PDF" ? "/reports/download/pdf" : "/reports/download/excel";

    const response = await api.get(apiPath(endpoint), {
      params: withScopedParams({
        reportType: parsed.reportType,
        nurseryId: parsed.nurseryId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        staffId: parsed.staffId,
        plantTypeId: parsed.plantTypeId,
        customerId: parsed.customerId,
      }),
      responseType: "arraybuffer",
    });

    const data = unwrap<any>(response);
    const byteLength = toByteLength(data);
    const fileName = `${(params.reportType || "REPORT").toLowerCase()}.${params.format === "PDF" ? "pdf" : "xlsx"}`;
    const contentType = params.format === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const base64 = toBase64(data);
    const fileUri = await saveAndShareFile({
      fileName,
      base64Content: base64,
      mimeType: contentType,
    });

    return {
      byteLength,
      fileName,
      contentType,
      fileUri,
    };
  },

  async reopenSavedFile(fileUri: string, contentType?: string) {
    if (!fileUri) {
      throw new Error("No exported report file found.");
    }

    const fileSystemModule: any = await import("expo-file-system/legacy");
    const FileSystem: any = fileSystemModule?.default || fileSystemModule;
    const getInfoAsync =
      FileSystem?.getInfoAsync ||
      FileSystem?.default?.getInfoAsync ||
      fileSystemModule?.getInfoAsync;
    const Sharing = await import("expo-sharing");
    if (!getInfoAsync) {
      throw new Error("File system read APIs are unavailable in this app runtime.");
    }
    const info = await getInfoAsync(fileUri);
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
