import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
const colors = ["#97482F", "#B58A52", "#45634D", "#6D607B"];
export function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Composición del costo, detalle en la tabla"
    >
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={4}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % 4]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => "$" + v.toFixed(2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Bars({
  data,
  keys,
  stacked = false,
}: {
  data: Record<string, string | number>[];
  keys: string[];
  stacked?: boolean;
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Comparativa, detalle en las tablas"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 12, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis width={45} />
          <Tooltip />
          <Legend />
          {keys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % 4]}
              stackId={stacked ? "total" : undefined}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
