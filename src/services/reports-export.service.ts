import { api, apiPath, unwrap } from "./api";
import { ApiReportFormat, ApiReportType } from "../constants/api-enums";
import { getApiMessage, getApiPayload } from "./api-contract.service";

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
}

export type ReportType = ApiReportType;
export type ReportFormat = ApiReportFormat;

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
    const byteLength =
      typeof data?.byteLength === "number"
        ? data.byteLength
        : typeof data?.length === "number"
          ? data.length
          : 0;
    return { byteLength };
  },
};
