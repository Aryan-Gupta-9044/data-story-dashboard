import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

const SERIES = ["#2F6F6B", "#D98E36", "#B4433A", "#5B6472", "#7A9E7E", "#8C6BB1", "#C9A227", "#3F88C5"];
const AXIS = { fontSize: 11, fill: "#8A93A0" };
const GRID = "#8A93A044";

const toArray = (obj) => Object.entries(obj || {}).map(([name, value]) => ({ name, value }));
const fmt = (n) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n);

function CustomTooltip({ active, payload, label, unit, total }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = label ?? p.name;
  return (
    <div className="border border-line dark:border-white/20 bg-paper dark:bg-inkdeep px-2.5 py-1.5 text-xs text-ink dark:text-paper">
      <div className="text-slate mb-0.5">{name}</div>
      <div className="figure">{unit ? `${unit}: ` : ""}{fmt(p.value)}{total ? ` (${((p.value / total) * 100).toFixed(1)}%)` : ""}</div>
    </div>
  );
}

function TypeSwitch({ value, options, onChange }) {
  return (
    <select aria-label="Chart type" className="border rule bg-transparent text-xs px-1.5 py-0.5 text-ink dark:text-paper" value={value} onChange={(e) => onChange(e.target.value)} data-html2canvas-ignore>
      {options.map((o) => <option key={o} value={o} className="text-ink">{o}</option>)}
    </select>
  );
}

function Frame({ title, right, children, empty, emptyText = "No data for this view." }) {
  return (
    <div className="border rule p-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm text-ink dark:text-paper mr-auto">{title}</h3>
        {right}
      </div>
      <div className="h-60">
        {empty ? (
          <div className="h-full flex items-center justify-center text-xs text-slate">{emptyText}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Renders bar / line / area from one dataset, so the type switch is a pure view change.
function Cartesian({ kind, data, dataKey = "value", xKey = "name", color, unit }) {
  const common = { data, margin: { left: -8, right: 8, top: 4 } };
  const axes = (
    <>
      <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey={xKey} tick={AXIS} minTickGap={20} />
      <YAxis tick={AXIS} width={48} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v)} />
      <Tooltip content={<CustomTooltip unit={unit} />} />
      <Legend wrapperStyle={{ fontSize: 11 }} formatter={() => unit || "value"} />
    </>
  );
  if (kind === "line") return <LineChart {...common}>{axes}<Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={2} /></LineChart>;
  if (kind === "area") return <AreaChart {...common}>{axes}<Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.2} /></AreaChart>;
  return <BarChart {...common}>{axes}<Bar dataKey={dataKey} fill={color} /></BarChart>;
}

export default function ChartPanel({ columns, charts, customAxis, onCustomAxisChange, metricName }) {
  const [trendType, setTrendType] = useState("area");
  const [breakType, setBreakType] = useState("bar");
  const [distType, setDistType] = useState("donut");
  const [customType, setCustomType] = useState("bar");

  const dateCol = columns.find((c) => c.type === "date");
  const catCol = columns.find((c) => c.type === "categorical");
  const numericCols = columns.filter((c) => c.type === "numeric");
  const axisCols = columns.filter((c) => c.type !== "numeric");

  const trend = charts.trend || [];
  const breakdown = toArray(charts.breakdown);
  const distribution = toArray(charts.distribution);
  const custom = toArray(charts.custom);
  const distTotal = distribution.reduce((a, b) => a + b.value, 0);
  const sel = "border rule bg-transparent text-xs px-1.5 py-0.5 text-ink dark:text-paper max-w-[7rem]";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <Frame title={dateCol ? `${metricName || "Value"} over ${dateCol.name}` : "Trend"} empty={!trend.length}
        right={<TypeSwitch value={trendType} options={["area", "line", "bar"]} onChange={setTrendType} />}>
        {Cartesian({ kind: trendType, data: trend, dataKey: "value", xKey: "date", color: SERIES[0], unit: metricName })}
      </Frame>

      <Frame title={catCol ? `${metricName || "Value"} by ${catCol.name}` : "Breakdown"} empty={!breakdown.length}
        right={<TypeSwitch value={breakType} options={["bar", "line", "area"]} onChange={setBreakType} />}>
        {Cartesian({ kind: breakType, data: breakdown, color: SERIES[1], unit: metricName })}
      </Frame>

      <Frame title={catCol ? `Share of records by ${catCol.name}` : "Distribution"} empty={!distribution.length}
        right={<TypeSwitch value={distType} options={["donut", "pie", "bar"]} onChange={setDistType} />}>
        {distType === "bar" ? (
          Cartesian({ kind: "bar", data: distribution, color: SERIES[2], unit: "records" })
        ) : (
          <PieChart>
            <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={distType === "donut" ? 45 : 0} outerRadius={80} paddingAngle={1}>
              {distribution.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} stroke="none" />)}
            </Pie>
            <Tooltip content={<CustomTooltip unit="records" total={distTotal} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        )}
      </Frame>

      <Frame
        title="Build your own"
        empty={!custom.length}
        emptyText="Pick an x-axis and a numeric y-axis above."
        right={
          <div className="flex gap-1.5 flex-wrap justify-end" data-html2canvas-ignore>
            <select aria-label="X axis" className={sel} value={customAxis.x} onChange={(e) => onCustomAxisChange({ ...customAxis, x: e.target.value })}>
              <option value="">x-axis…</option>
              {axisCols.map((c) => <option key={c.name} value={c.name} className="text-ink">{c.name}</option>)}
            </select>
            <select aria-label="Y axis" className={sel} value={customAxis.y} onChange={(e) => onCustomAxisChange({ ...customAxis, y: e.target.value })}>
              <option value="">y-axis…</option>
              {numericCols.map((c) => <option key={c.name} value={c.name} className="text-ink">{c.name}</option>)}
            </select>
            <TypeSwitch value={customType} options={["bar", "line", "area"]} onChange={setCustomType} />
          </div>
        }
      >
        {Cartesian({ kind: customType, data: custom, color: SERIES[3], unit: customAxis.y })}
      </Frame>
    </div>
  );
}
