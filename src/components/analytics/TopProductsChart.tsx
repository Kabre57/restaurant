// src/components/analytics/TopProductsChart.tsx
"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TopProductItem } from "@/services/analytics.service";

interface TopProductsChartProps {
  data: TopProductItem[];
}

const COLORS = ["#FF6D00", "#FF8526", "#FFA150", "#FFBD7A", "#FFD9A3"];

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data }) => {
  const chartData = data.slice(0, 5).map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
    quantite: item.quantitySold,
    revenu: item.revenue,
  }));

  return (
    <div className="w-full h-[320px] bg-white dark:bg-[#181a20] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] dark:text-[#72788f]">
          Top Produits (Quantités)
        </h3>
        <p className="text-xs font-semibold text-slate-400 dark:text-white/40 mt-1">
          Les 5 articles les plus demandés.
        </p>
      </div>

      <div className="w-full h-[220px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(24, 26, 32, 0.95)",
                  borderRadius: "16px",
                  borderColor: "#2E3440",
                  color: "#ECEFF4",
                  fontSize: "11px",
                }}
                formatter={(value, name) => [
                  value,
                  name === "quantite" ? "Quantité vendue" : "Revenu",
                ]}
              />
              <Bar dataKey="quantite" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
