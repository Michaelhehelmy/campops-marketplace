import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
console.log("DEBUG TOAST", toast);
import { format } from "date-fns";
import { DollarSign, FileText, CheckCircle, XCircle, Plus, Edit2, Trash2 } from "lucide-react";
import type { StaffFinance, StaffAllowanceRequest, UserAdmin } from "@/types/api";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// ============================================
// PAYROLL FORM
// ============================================
function PayrollForm({
  record,
  users,
  onSubmit,
  onCancel,
}: {
  record?: StaffFinance;
  users: UserAdmin[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    user_id: record?.user_id || "",
    base_salary: record?.base_salary || 0,
    bonus: record?.bonus || 0,
    deductions: record?.deductions || 0,
    currency: record?.currency || "USD",
    period_start: record?.period_start ? format(new Date(record.period_start), "yyyy-MM-dd") : "",
    period_end: record?.period_end ? format(new Date(record.period_end), "yyyy-MM-dd") : "",
    status: record?.status || "pending",
    notes: record?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Staff Member</Label>
        <Select
          value={formData.user_id}
          onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
          placeholder="Select staff"
          options={users.map((u) => ({ value: u.id, label: u.full_name || u.email }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="base_salary">Base Salary</Label>
          <Input
            id="base_salary"
            type="number"
            value={formData.base_salary}
            onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Input
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bonus">Bonus</Label>
          <Input
            id="bonus"
            type="number"
            value={formData.bonus}
            onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deductions">Deductions</Label>
          <Input
            id="deductions"
            type="number"
            value={formData.deductions}
            onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="period_start">Period Start</Label>
          <Input
            id="period_start"
            type="date"
            value={formData.period_start}
            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period_end">Period End</Label>
          <Input
            id="period_end"
            type="date"
            value={formData.period_end}
            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as "pending" | "verified" | "paid" })
          }
          options={[
            { value: "pending", label: "Pending" },
            { value: "verified", label: "Verified" },
            { value: "paid", label: "Paid" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Input
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{record ? "Update Record" : "Create Record"}</Button>
      </div>
    </form>
  );
}

export default function AdminFinancesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("payroll");
  const [payrollDialog, setPayrollDialog] = useState<{ open: boolean; record?: StaffFinance }>({
    open: false,
  });

  // Fetch Users for assignment
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => get<{ data: UserAdmin[]; pagination: any }>("/users"),
  });
  const users = Array.isArray(usersData) ? usersData : (usersData as any)?.data || [];

  // Fetch Payroll Data
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: queryKeys.staffFinances,
    queryFn: () =>
      get<{ data: StaffFinance[]; pagination: any }>("/staff_finances?order=created_at&asc=false"),
  });
  const payrollRecords = Array.isArray(payrollData)
    ? payrollData
    : (payrollData as any)?.data || [];

  // Fetch Allowance Requests
  const { data: requestData, isLoading: requestsLoading } = useQuery({
    queryKey: queryKeys.staffAllowanceRequests,
    queryFn: () =>
      get<{ data: StaffAllowanceRequest[]; pagination: any }>(
        "/staff_allowance_requests?order=created_at&asc=false"
      ),
  });
  const allowanceRequests = Array.isArray(requestData)
    ? requestData
    : (requestData as any)?.data || [];

  // Mutations: Payroll
  const createPayroll = useMutation({
    mutationFn: (data: any) => post("/staff_finances", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffFinances });
      toast.success("Payroll record created successfully");
      setPayrollDialog({ open: false });
    },
    onError: () => toast.error("Failed to create payroll record"),
  });

  const updatePayroll = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/staff_finances/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffFinances });
      toast.success("Payroll record updated successfully");
      setPayrollDialog({ open: false });
    },
    onError: () => toast.error("Failed to update payroll record"),
  });

  const deletePayroll = useMutation({
    mutationFn: (id: string) => del(`/staff_finances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffFinances });
      toast.success("Payroll record deleted");
    },
    onError: () => toast.error("Failed to delete record"),
  });

  // Mutations: Allowances
  const updateAllowanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/staff_allowance_requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffAllowanceRequests });
      toast.success("Request status updated");
    },
    onError: () => toast.error("Failed to update request"),
  });

  const handlePayrollSubmit = (data: any) => {
    if (payrollDialog.record) {
      updatePayroll.mutate({ id: payrollDialog.record.id, data });
    } else {
      createPayroll.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      paid: "success",
      verified: "success",
      approved: "success",
      pending: "warning",
      rejected: "destructive",
    };
    return (
      <Badge variant={map[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.full_name || user.email : "Unknown User";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Staff Finances</h1>
          <p className="text-muted-foreground">Manage staff payroll and allowance requests.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger
            value="payroll"
            className="flex items-center gap-2"
            data-testid="payroll-tab"
          >
            <DollarSign className="h-4 w-4" />
            Payroll Records
          </TabsTrigger>
          <TabsTrigger
            value="allowances"
            className="flex items-center gap-2"
            data-testid="allowances-tab"
          >
            <FileText className="h-4 w-4" />
            Allowance Requests
          </TabsTrigger>
        </TabsList>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payroll Records</CardTitle>
                <CardDescription>View and manage staff payments.</CardDescription>
              </div>
              <Dialog
                open={payrollDialog.open && !payrollDialog.record}
                onOpenChange={(open: boolean) => setPayrollDialog({ open })}
              >
                <DialogTrigger asChild>
                  <Button data-testid="new-payroll-record-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    New Record
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Payroll Record</DialogTitle>
                  </DialogHeader>
                  <PayrollForm
                    users={users}
                    onSubmit={handlePayrollSubmit}
                    onCancel={() => setPayrollDialog({ open: false })}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {payrollLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : payrollRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payroll records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="payroll-table">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">
                          Staff Member
                        </th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Period</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Net Pay</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          data-testid="payroll-row"
                        >
                          <td className="py-3 pr-4 font-medium">{getUserName(record.user_id)}</td>
                          <td className="py-3 pr-4">
                            {record.period_start
                              ? format(new Date(record.period_start), "MMM d")
                              : ""}{" "}
                            -{" "}
                            {record.period_end
                              ? format(new Date(record.period_end), "MMM d, yyyy")
                              : ""}
                          </td>
                          <td className="py-3 pr-4 font-semibold">
                            {formatCurrency(Number(record.net_salary), record.currency)}
                          </td>
                          <td className="py-3 pr-4">{getStatusBadge(record.status)}</td>
                          <td className="py-3 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPayrollDialog({ open: true, record })}
                              data-testid={`edit-payroll-${record.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this payroll record?"))
                                  deletePayroll.mutate(record.id);
                              }}
                              data-testid={`delete-payroll-${record.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog
            open={payrollDialog.open && !!payrollDialog.record}
            onOpenChange={(open: boolean) => !open && setPayrollDialog({ open: false })}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Payroll Record</DialogTitle>
              </DialogHeader>
              {payrollDialog.record && (
                <PayrollForm
                  record={payrollDialog.record}
                  users={users}
                  onSubmit={handlePayrollSubmit}
                  onCancel={() => setPayrollDialog({ open: false })}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ALLOWANCES TAB */}
        <TabsContent value="allowances" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Allowance Requests</CardTitle>
                <CardDescription>Review and approve staff allowance requests.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : allowanceRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No allowance requests found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">
                          Staff Member
                        </th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Reason</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowanceRequests.map((req) => (
                        <tr
                          key={req.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 pr-4 font-medium">{getUserName(req.user_id)}</td>
                          <td className="py-3 pr-4">
                            {format(new Date(req.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="py-3 pr-4 font-semibold">
                            {formatCurrency(Number(req.amount))}
                          </td>
                          <td className="py-3 pr-4 max-w-xs truncate" title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="py-3 pr-4">{getStatusBadge(req.status)}</td>
                          <td className="py-3 text-right space-x-2 flex justify-end">
                            {req.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() =>
                                    updateAllowanceStatus.mutate({ id: req.id, status: "approved" })
                                  }
                                  disabled={updateAllowanceStatus.isPending}
                                  data-testid={`approve-allowance-${req.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() =>
                                    updateAllowanceStatus.mutate({ id: req.id, status: "rejected" })
                                  }
                                  disabled={updateAllowanceStatus.isPending}
                                  data-testid={`reject-allowance-${req.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
