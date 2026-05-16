/**
 * Staff Finances Page
 * View salary history, bonuses, deductions, and net pay
 * Uses generic CRUD endpoint GET /api/staff_finances (self-filtered by user_id)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { StaffFinance, StaffAllowanceRequest } from "@/types/api";
import { format } from "date-fns";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function StaffFinancesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [requestDialog, setRequestDialog] = useState(false);
  const [requestData, setRequestData] = useState({ amount: "", reason: "" });

  const { data: finances, isLoading: financesLoading } = useQuery({
    queryKey: queryKeys.staffFinances,
    queryFn: async () => {
      const response = await get<{ data: StaffFinance[] }>("/staff_finances");
      return response.data;
    },
  });

  const { data: allowanceRes, isLoading: allowancesLoading } = useQuery({
    queryKey: queryKeys.staffAllowanceRequests,
    queryFn: async () => {
      const response = await get<{ data: StaffAllowanceRequest[] }>("/staff_allowance_requests");
      return response.data;
    },
  });

  const createRequest = useMutation({
    mutationFn: (data: any) => post("/staff_allowance_requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffAllowanceRequests });
      toast({ title: "Allowance request submitted" });
      setRequestDialog(false);
      setRequestData({ amount: "", reason: "" });
    },
    onError: () => toast({ title: "Failed to submit request", variant: "destructive" }),
  });

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequest.mutate({
      user_id: user?.id,
      amount: Number(requestData.amount),
      reason: requestData.reason,
      status: "pending",
    });
  };

  const records = Array.isArray(finances) ? finances : [];
  const allowanceRecords = Array.isArray(allowanceRes) ? allowanceRes : [];

  // Compute summary from latest record
  const latest = records[0] ?? null;
  const totalEarned = records.reduce((sum, r) => sum + Number(r.net_salary || 0), 0);
  const totalBonuses = records.reduce((sum, r) => sum + Number(r.bonus || 0), 0);
  const totalDeductions = records.reduce((sum, r) => sum + Number(r.deductions || 0), 0);

  const statusColors: Record<string, "success" | "warning" | "secondary"> = {
    paid: "success",
    verified: "success",
    pending: "warning",
  };

  if (financesLoading || allowancesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="finances-heading">
          My Finances
        </h1>
        <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
          <DialogTrigger asChild>
            <Button>Request Allowance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Allowance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={requestData.amount}
                  onChange={(e) => setRequestData({ ...requestData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason for Request</Label>
                <Input
                  required
                  value={requestData.reason}
                  onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setRequestDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRequest.isPending}>
                  Submit Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Base Salary</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latest ? formatCurrency(Number(latest.base_salary), latest.currency) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earned (All Periods)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEarned, latest?.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bonuses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalBonuses, latest?.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Deductions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDeductions, latest?.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your salary records by period</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No finance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="payment-history-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Period</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Base Salary</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Bonus</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Deductions</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Net Pay</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        {format(new Date(record.period_start), "MMM d")} –{" "}
                        {format(new Date(record.period_end), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 pr-4">
                        {formatCurrency(Number(record.base_salary), record.currency)}
                      </td>
                      <td className="py-3 pr-4 text-blue-600">
                        +{formatCurrency(Number(record.bonus), record.currency)}
                      </td>
                      <td className="py-3 pr-4 text-red-600">
                        -{formatCurrency(Number(record.deductions), record.currency)}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {formatCurrency(Number(record.net_salary), record.currency)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={statusColors[record.status] || "secondary"}
                          className="capitalize"
                        >
                          {record.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allowance Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Allowance Requests</CardTitle>
          <CardDescription>History of your allowance and advance requests</CardDescription>
        </CardHeader>
        <CardContent>
          {allowanceRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No allowance requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Reason</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allowanceRecords.map((req) => (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        {format(new Date(req.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {formatCurrency(Number(req.amount))}
                      </td>
                      <td className="py-3 pr-4 max-w-sm truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={statusColors[req.status] || "secondary"}
                          className="capitalize"
                        >
                          {req.status}
                        </Badge>
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
