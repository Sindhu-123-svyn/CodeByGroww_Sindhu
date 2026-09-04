import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDate, formatPrice } from "../../lib/formatters";
import type { PriceHistoryPoint } from "../../api/types";

export function PriceHistoryChart({ points }: { points: PriceHistoryPoint[] }) {
  if (points.length === 0) {
    return <p className="muted">No price history in this range yet.</p>;
  }

  const data = points.map((p) => ({ ...p, dateLabel: formatDate(p.tick_time) }));
  const isUp = data[data.length - 1].price >= data[0].price;
  const lineColor = isUp ? "var(--success)" : "var(--danger)";

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.16} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--gray-200)" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          minTickGap={40}
          axisLine={{ stroke: "var(--gray-200)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          domain={["auto", "auto"]}
          tickFormatter={(v) => formatPrice(v)}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          formatter={(value) => (typeof value === "number" ? [formatPrice(value), "Price"] : String(value))}
          labelFormatter={(label) => label}
          contentStyle={{
            borderRadius: 10,
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            fontSize: 12.5,
          }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#priceFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
