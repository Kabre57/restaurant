// src/components/analytics/ExportButtons.tsx
"use client";

import React, { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { FetchDashboardParams } from "@/services/analytics.client";
import { useToast } from "@/components/ui/Toast";

interface ExportButtonsProps {
  params: FetchDashboardParams;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ params }) => {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const toast = useToast();

  const handleExport = async (format: "excel" | "pdf") => {
    if (format === "excel") {
      setLoadingExcel(true);
    } else {
      setLoadingPdf(true);
    }

    try {
      const query = new URLSearchParams();
      query.append("format", format);
      if (params.startDate) query.append("startDate", params.startDate);
      if (params.endDate) query.append("endDate", params.endDate);
      if (params.storeId) query.append("storeId", params.storeId);
      if (params.period) query.append("period", params.period);

      const res = await fetch(`/api/analytics/export?${query.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la génération du fichier d'export");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-analytique-${new Date().toISOString().slice(0, 10)}.${
        format === "excel" ? "xlsx" : "pdf"
      }`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast(`Export ${format === "excel" ? "Excel" : "PDF"} téléchargé avec succès`, "success");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erreur lors de la génération du fichier";
      toast(msg, "error");
    } finally {
      if (format === "excel") {
        setLoadingExcel(false);
      } else {
        setLoadingPdf(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={() => handleExport("excel")}
        disabled={loadingExcel || loadingPdf}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer"
      >
        {loadingExcel ? (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Exporter Excel
      </button>

      <button
        onClick={() => handleExport("pdf")}
        disabled={loadingExcel || loadingPdf}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-700 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer"
      >
        {loadingPdf ? (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Exporter PDF
      </button>
    </div>
  );
};
