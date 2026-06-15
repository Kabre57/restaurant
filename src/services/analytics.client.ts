// src/services/analytics.client.ts
import { DashboardReport } from "./analytics.service";

export interface FetchDashboardParams {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  period?: "hour" | "day" | "month" | "year";
}

export class AnalyticsClient {
  /**
   * Fetches analytical dashboard stats from the API.
   */
  static async getDashboard(params: FetchDashboardParams = {}): Promise<DashboardReport> {
    const query = new URLSearchParams();
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.storeId) query.append("storeId", params.storeId);
    if (params.period) query.append("period", params.period);

    const res = await fetch(`/api/analytics/dashboard?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch analytics dashboard");
    }

    return res.json();
  }

  /**
   * Downloads the analytical dashboard stats in Excel or PDF format.
   */
  static exportData(format: "excel" | "pdf", params: FetchDashboardParams = {}): void {
    const query = new URLSearchParams();
    query.append("format", format);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.storeId) query.append("storeId", params.storeId);
    if (params.period) query.append("period", params.period);

    // Trigger browser download
    const url = `/api/analytics/export?${query.toString()}`;
    window.open(url, "_blank");
  }
}
