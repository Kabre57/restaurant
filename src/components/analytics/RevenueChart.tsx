// src/components/analytics/RevenueChart.tsx
"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RevenuePoint } from "@/services/analytics.service";

interface RevenueChartProps {
  data: RevenuePoint[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[320px] bg-white dark:bg-[#181a20] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] dark:text-[#72788f]">
          Évolution des Ventes (CA)
        </h3>
        <p className="text-2xl font-black text-[#171717] dark:text-white mt-1">
          {data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()} FCFA
        </p>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6D00" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FF6D00" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(24, 26, 32, 0.95)",
                borderRadius: "16px",
                borderColor: "#2E3440",
                color: "#ECEFF4",
                fontSize: "11px",
              }}
             formatter={(value) => {
               const num = typeof value === "number" ? value : Number(value);
               return [`${num.toLocaleString()} FCFA`, "Revenu"];
             }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#FF6D00"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
