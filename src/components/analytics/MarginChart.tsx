// src/components/analytics/MarginChart.tsx
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

interface MarginChartProps {
  data: TopProductItem[];
}

const COLORS = ["#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];

export const MarginChart: React.FC<MarginChartProps> = ({ data }) => {
  const chartData = data.slice(0, 5).map((item) => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name,
    margeRate: Math.max(0, Math.round(item.marginPercent)),
  }));

  return (
    <div className="w-full h-[320px] bg-white dark:bg-[#181a20] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] dark:text-[#72788f]">
          Taux de Marge par Produit (%)
        </h3>
        <p className="text-xs font-semibold text-slate-400 dark:text-white/40 mt-1">
          Marge générée sur les produits phares.
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
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                domain={[0, 100]}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(24, 26, 32, 0.95)",
                  borderRadius: "16px",
                  borderColor: "#2E3440",
                  color: "#ECEFF4",
                  fontSize: "11px",
                }}
                formatter={(value) => [`${value}%`, "Taux de marge"]}
              />
              <Bar dataKey="margeRate" radius={[0, 8, 8, 0]} barSize={16}>
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
