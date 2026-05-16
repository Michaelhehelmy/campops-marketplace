import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ShoppingCart,
  Users,
  Activity,
  Truck,
  RefreshCw,
} from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
}

interface RevenueBreakdown {
  reservations: number;
  pos_orders: number;
  activities: number;
  transfers: number;
  other: number;
}

interface ExpenseBreakdown {
  inventory_purchases: number;
  staff_allowances: number;
  refunds: number;
  operational: number;
  other: number;
}

interface Transaction {
  id: string;
  type: "revenue" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
  reference_id?: string;
}

export default function AdminBillingPage() {
  const [dateRange, setDateRange] = useState("30"); // days
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Calculate date range
  const getStartDate = () => {
    if (dateRange === "custom" && customStart) return new Date(customStart);
    const days = parseInt(dateRange);
    return subDays(new Date(), isNaN(days) ? 30 : days);
  };

  const getEndDate = () => {
    if (dateRange === "custom" && customEnd) return new Date(customEnd);
    return new Date();
  };

  const startDate = getStartDate();
  const endDate = getEndDate();

  // Fetch financial summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["admin-financial-summary", dateRange, customStart, customEnd],
    queryFn: async () => {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");
      const response = await get<{ data: FinancialSummary }>(
        `/admin/financials/summary?start_date=${start}&end_date=${end}`
      );
      return response.data;
    },
  });

  // Fetch revenue breakdown
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin-revenue-breakdown", dateRange, customStart, customEnd],
    queryFn: async () => {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");
      const response = await get<{ data: RevenueBreakdown }>(
        `/admin/financials/revenue?start_date=${start}&end_date=${end}`
      );
      return response.data;
    },
  });

  // Fetch expense breakdown
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["admin-expense-breakdown", dateRange, customStart, customEnd],
    queryFn: async () => {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");
      const response = await get<{ data: ExpenseBreakdown }>(
        `/admin/financials/expenses?start_date=${start}&end_date=${end}`
      );
      return response.data;
    },
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["admin-transactions", dateRange, customStart, customEnd],
    queryFn: async () => {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");
      const response = await get<{ data: Transaction[] }>(
        `/admin/financials/transactions?start_date=${start}&end_date=${end}`
      );
      return response.data;
    },
  });

  const summary = summaryData || {
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    profit_margin: 0,
  };
  const revenue = revenueData || {
    reservations: 0,
    pos_orders: 0,
    activities: 0,
    transfers: 0,
    other: 0,
  };
  const expenses = expenseData || {
    inventory_purchases: 0,
    staff_allowances: 0,
    refunds: 0,
    operational: 0,
    other: 0,
  };
  const transactions = transactionsData || [];

  const handleExport = async () => {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    try {
      const response = await get(`/admin/financials/export?start_date=${start}&end_date=${end}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response as BlobPart]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `financial-report-${start}-to-${end}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    positive,
  }: {
    title: string;
    value: string;
    icon: any;
    trend?: number;
    trendValue?: string;
    positive?: boolean;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {trend !== undefined && (
              <div
                className={`flex items-center mt-2 text-sm ${positive ? "text-green-600" : "text-red-600"}`}
              >
                {positive ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-full ${positive !== false ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RevenueCard = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: number;
    icon: any;
  }) => (
    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold text-green-600">{formatCurrency(value)}</span>
    </div>
  );

  const ExpenseCard = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: number;
    icon: any;
  }) => (
    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold text-red-600">{formatCurrency(value)}</span>
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="admin-billing-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="billing-heading">
            Financial Overview
          </h1>
          <p className="text-muted-foreground">
            Track revenue, expenses, and profit across all operations.
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label>Date Range</Label>
              <select
                className="mt-2 w-full h-10 rounded-md border border-stone-200 bg-white px-3"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            {dateRange === "custom" && (
              <>
                <div className="flex-1">
                  <Label htmlFor="custom-start">Start Date</Label>
                  <Input
                    id="custom-start"
                    type="date"
                    className="mt-2"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="custom-end">End Date</Label>
                  <Input
                    id="custom-end"
                    type="date"
                    className="mt-2"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(summary.total_revenue ?? 0)}
              icon={DollarSign}
              positive
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(summary.total_expenses ?? 0)}
              icon={TrendingDown}
              positive={false}
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(summary.net_profit ?? 0)}
              icon={TrendingUp}
              positive={(summary.net_profit ?? 0) >= 0}
            />
            <StatCard
              title="Profit Margin"
              value={`${(summary.profit_margin ?? 0).toFixed(1)}%`}
              icon={RefreshCw}
              positive={(summary.profit_margin ?? 0) >= 0}
            />
          </>
        )}
      </div>

      {/* Revenue and Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Income sources for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : (
              <>
                <RevenueCard label="Reservations" value={revenue.reservations} icon={FileText} />
                <RevenueCard label="POS Orders" value={revenue.pos_orders} icon={ShoppingCart} />
                <RevenueCard label="Activities" value={revenue.activities} icon={Activity} />
                <RevenueCard label="Transfers" value={revenue.transfers} icon={Truck} />
                <RevenueCard label="Other" value={revenue.other} icon={DollarSign} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Cost categories for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenseLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : (
              <>
                <ExpenseCard
                  label="Inventory Purchases"
                  value={expenses.inventory_purchases}
                  icon={ShoppingCart}
                />
                <ExpenseCard
                  label="Staff Allowances"
                  value={expenses.staff_allowances}
                  icon={Users}
                />
                <ExpenseCard label="Refunds" value={expenses.refunds} icon={RefreshCw} />
                <ExpenseCard
                  label="Operational Costs"
                  value={expenses.operational}
                  icon={FileText}
                />
                <ExpenseCard label="Other" value={expenses.other} icon={DollarSign} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities across the system</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="transactions-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Category</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Description</th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4 text-sm">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            tx.type === "revenue"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm">{tx.category}</td>
                      <td className="py-3 pr-4 text-sm">{tx.description}</td>
                      <td
                        className={`py-3 text-right font-semibold ${tx.type === "revenue" ? "text-green-600" : "text-red-600"}`}
                      >
                        {tx.type === "revenue" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
