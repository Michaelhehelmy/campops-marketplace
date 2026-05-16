import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import type { RevenueMetrics, HospitalityDailyMetrics, HousekeepingPrediction } from "@/types/api";
import { BarChart3, TrendingUp, ClipboardList, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#2E8B57", "#8B5A2B", "#CD5C5C", "#36454F"]; // Oasis, Acacia, Clay, Charcoal

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"revenue" | "hospitality" | "housekeeping">("revenue");
  const [days, setDays] = useState(30);

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: queryKeys.revenueReport(startDate, endDate),
    queryFn: () =>
      get<RevenueMetrics>(`/reports/revenue?start_date=${startDate}&end_date=${endDate}`),
    enabled: activeTab === "revenue",
  });

  const { data: hospitality, isLoading: hospLoading } = useQuery({
    queryKey: queryKeys.hospitalityReport(days),
    queryFn: () => get<HospitalityDailyMetrics[]>(`/reports/hospitality?days=${days}`),
    enabled: activeTab === "hospitality",
  });

  const { data: predictions, isLoading: predLoading } = useQuery({
    queryKey: queryKeys.housekeepingPredictions,
    queryFn: () => get<HousekeepingPrediction[]>("/reports/predictions/housekeeping"),
    enabled: activeTab === "housekeeping",
  });

  const tabs = [
    { key: "revenue" as const, label: "Revenue Report", icon: BarChart3 },
    { key: "hospitality" as const, label: "Hospitality Metrics", icon: TrendingUp },
    { key: "housekeeping" as const, label: "Housekeeping Prediction", icon: ClipboardList },
  ];

  const pieData = revenue
    ? [
        { name: "Accommodation", value: revenue.revenue_breakdown.accommodation },
        { name: "F&B", value: revenue.revenue_breakdown.f_and_b },
        { name: "Activities", value: revenue.revenue_breakdown.activities },
        { name: "Others", value: revenue.revenue_breakdown.others },
      ]
    : [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      {/* Date Range */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="start-date-input"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="end-date-input"
              />
            </div>
            {activeTab === "hospitality" && (
              <div>
                <Label htmlFor="days-count">Days</Label>
                <Input
                  id="days-count"
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  min={7}
                  max={365}
                  className="w-24"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={activeTab === t.key ? "default" : "ghost"}
            onClick={() => setActiveTab(t.key)}
            className="gap-2"
            data-testid={`${t.key}-tab`}
          >
            <t.icon size={16} /> {t.label}
          </Button>
        ))}
      </div>

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <div data-testid="reports-content">
          {revLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          ) : !revenue ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No revenue data for the selected period.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 report">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">ADR</p>
                    <p className="text-2xl font-bold">{formatCurrency(revenue.adr)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">RevPAR</p>
                    <p className="text-2xl font-bold">{formatCurrency(revenue.revpar)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Occupancy</p>
                    <p className="text-2xl font-bold">{revenue.occupancy_rate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(revenue.total_revenue)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadCsv(
                        "revenue-breakdown.csv",
                        ["Category", "Amount"],
                        pieData.map((d) => [d.name, d.value.toString()])
                      )
                    }
                  >
                    <Download size={14} className="mr-1" /> CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div role="img" aria-label="Revenue Breakdown Pie Chart">
                    <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }: { name: string; percent: number }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Hospitality Tab */}
      {activeTab === "hospitality" && (
        <div data-testid="hospitality-content">
          {hospLoading ? (
            <Skeleton className="h-80" data-testid="hospitality-chart" />
          ) : !hospitality || hospitality.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hospitality data available.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daily Hospitality Metrics ({days} days)</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      "hospitality-metrics.csv",
                      ["Date", "ADR", "RevPAR", "Occupancy %"],
                      hospitality.map((d) => [
                        d.date,
                        d.adr.toFixed(2),
                        d.revpar.toFixed(2),
                        d.occupancy_rate.toFixed(1),
                      ])
                    )
                  }
                >
                  <Download size={14} className="mr-1" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div
                  className="h-80"
                  data-testid="hospitality-chart"
                  role="img"
                  aria-label="Daily Hospitality Metrics Line Chart"
                >
                  <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                    <LineChart data={hospitality}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="adr"
                        stroke="#8B5A2B"
                        name="ADR"
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revpar"
                        stroke="#2E8B57"
                        name="RevPAR"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="occupancy_rate"
                        stroke="#CD5C5C"
                        name="Occupancy %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Housekeeping Prediction Tab */}
      {activeTab === "housekeeping" &&
        (predLoading ? (
          <Skeleton className="h-80" />
        ) : !predictions || predictions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No prediction data available.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Housekeeping Workload Prediction (Next 7 Days)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    "housekeeping-prediction.csv",
                    ["Date", "Departures", "Arrivals", "Stay-Overs", "Est. Minutes"],
                    predictions.map((d) => [
                      d.date,
                      d.departures.toString(),
                      d.arrivals.toString(),
                      d.stay_overs.toString(),
                      d.estimated_minutes.toString(),
                    ])
                  )
                }
              >
                <Download size={14} className="mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent data-testid="housekeeping-content">
              <div
                className="h-80"
                data-testid="housekeeping-chart"
                role="img"
                aria-label="Housekeeping Workload Bar Chart"
              >
                <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                  <BarChart data={predictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="departures" fill="#CD5C5C" name="Departures" />
                    <Bar dataKey="arrivals" fill="#2E8B57" name="Arrivals" />
                    <Bar dataKey="stay_overs" fill="#8B5A2B" name="Stay-Overs" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                className="mt-6 overflow-auto"
                tabIndex={0}
                aria-label="Housekeeping workload table"
              >
                <table className="w-full text-sm" data-testid="housekeeping-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right">Departures</th>
                      <th className="text-right">Arrivals</th>
                      <th className="text-right">Stay-Overs</th>
                      <th className="text-right">Est. Minutes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((d) => (
                      <tr key={d.date} className="border-b">
                        <td className="py-2">{d.date}</td>
                        <td className="text-right">{d.departures}</td>
                        <td className="text-right">{d.arrivals}</td>
                        <td className="text-right">{d.stay_overs}</td>
                        <td className="text-right font-medium">{d.estimated_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
