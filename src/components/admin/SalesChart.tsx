'use client'

import React from 'react'

interface DataPoint {
  name: string
  value: number
}

interface SalesChartProps {
  data: DataPoint[]
  title: string
}

export default function SalesChart({ data, title }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-[#f8f9fa] rounded-2xl border-2 border-dashed border-[#dee2e6]">
        <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Aucune donnée disponible</span>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const height = 200
  const width = 800
  const barWidth = (width / data.length) * 0.8
  const spacing = (width / data.length) * 0.2

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest">{title}</h3>
      </div>
      
      <div className="relative h-64 w-full pt-10">
        <svg viewBox={`0 0 ${width} ${height + 40}`} className="w-full h-full overflow-visible">
          {data.map((d, i) => {
            const barHeight = (d.value / maxValue) * height
            const x = i * (barWidth + spacing)
            const y = height - barHeight

            return (
              <g key={i} className="group">
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#339af0"
                  rx="8"
                  className="transition-all duration-500 hover:fill-[#228be6] cursor-pointer"
                >
                  <title>{`${d.name}: ${d.value.toLocaleString()} FCFA`}</title>
                </rect>
                
                {/* Value Label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 10}
                  textAnchor="middle"
                  className="text-[10px] font-black fill-[#adb5bd] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {Math.round(d.value / 1000)}k
                </text>

                {/* Name Label */}
                <text
                  x={x + barWidth / 2}
                  y={height + 25}
                  textAnchor="middle"
                  className="text-[8px] font-black fill-[#adb5bd] uppercase tracking-tighter"
                >
                  {d.name}
                </text>
              </g>
            )
          })}

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line
              key={p}
              x1="0"
              y1={height * p}
              x2={width}
              y2={height * p}
              stroke="#e9ecef"
              strokeDasharray="4 4"
              className="z-0"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
