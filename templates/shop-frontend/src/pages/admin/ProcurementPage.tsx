import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
import type { ProcurementRecord, InventoryItem } from "@/types/api";
import { Truck, Plus, PackageOpen, CheckCircle, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function ProcurementForm({
  record,
  inventoryItems,
  onSubmit,
  onCancel,
}: {
  record?: ProcurementRecord;
  inventoryItems: InventoryItem[];
  onSubmit: (data: Partial<ProcurementRecord>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    item_id: record?.item_id || "",
    item_name: record?.item_name || "",
    requested_quantity: record?.requested_quantity || 1,
    unit: record?.unit || "pcs",
    unit_cost: record?.unit_cost || 0,
    supplier: record?.supplier || "",
    status: record?.status || "draft",
    notes: record?.notes || "",
  });

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itemId = e.target.value;
    const selectedItem = inventoryItems.find((i) => i.id === itemId);
    setFormData({
      ...formData,
      item_id: itemId,
      item_name: selectedItem?.name || "",
      unit: selectedItem?.unit || "pcs",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_cost: Number(formData.requested_quantity) * Number(formData.unit_cost),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Inventory Item</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={formData.item_id}
          onChange={handleItemSelect}
          required
        >
          <option value="">Select an item to procure...</option>
          {inventoryItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.unit})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantity. ({formData.unit})</Label>
          <Input
            type="number"
            min="0.1"
            step="0.1"
            value={formData.requested_quantity}
            onChange={(e) =>
              setFormData({ ...formData, requested_quantity: Number(e.target.value) })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Cost per {formData.unit} ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.unit_cost}
            onChange={(e) => setFormData({ ...formData, unit_cost: Number(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Supplier (Optional)</Label>
        <Input
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          placeholder="e.g. Fresh Foods Supplier"
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as ProcurementRecord["status"] })
          }
          options={[
            { value: "draft", label: "Draft" },
            { value: "approved", label: "Approved" },
            { value: "received", label: "Received" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Input
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Purchase justification or details..."
        />
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{record ? "Update Request" : "Create Request"}</Button>
      </div>
    </form>
  );
}

export default function ProcurementPage() {
  const qc = useQueryClient();
  const [formDialog, setFormDialog] = useState<{ open: boolean; record?: ProcurementRecord }>({
    open: false,
  });

  const { data: rawProcurementData, isLoading } = useQuery({
    queryKey: queryKeys.procurement,
    queryFn: () => get<ProcurementRecord[]>("/procurement"),
    staleTime: 1000 * 30,
  });

  // Handle both generic backend (/api/procurement_records) pagination style and direct array style
  const records: ProcurementRecord[] = Array.isArray(rawProcurementData)
    ? rawProcurementData
    : ((rawProcurementData as any)?.data as ProcurementRecord[]) || [];

  const { data: invData } = useQuery({
    queryKey: queryKeys.inventory,
    queryFn: () => get<{ data: InventoryItem[] }>("/inventory"),
  });
  const inventoryItems = invData?.data || [];

  const createRecord = useMutation({
    mutationFn: (data: Partial<ProcurementRecord>) => post("/procurement_records", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurement });
      toast.success("Procurement request created");
      setFormDialog({ open: false });
    },
    onError: () => toast.error("Failed to create request"),
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcurementRecord> }) =>
      put(`/procurement_records/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurement });
      toast.success("Procurement updated");
      setFormDialog({ open: false });
    },
    onError: () => toast.error("Failed to update procurement"),
  });

  const deleteRecord = useMutation({
    mutationFn: (id: string) => del(`/procurement_records/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurement });
      toast.success("Procurement deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const updateStatusFast = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      put(`/procurement/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurement });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const handleFormSubmit = (data: Partial<ProcurementRecord>) => {
    if (formDialog.record) {
      updateRecord.mutate({ id: formDialog.record.id, data });
    } else {
      createRecord.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "destructive" | "default" | "secondary"> = {
      approved: "success",
      received: "secondary",
      draft: "warning",
      rejected: "destructive",
    };
    return (
      <Badge variant={map[status] || "default"} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PackageOpen className="h-8 w-8 text-primary" />
            Procurement
          </h1>
          <p className="text-muted-foreground">Manage purchase requests and incoming restocks.</p>
        </div>
        <Button onClick={() => setFormDialog({ open: true })}>
          <Plus size={18} className="mr-2" /> New Request
        </Button>
      </div>

      <Dialog
        open={formDialog.open}
        onOpenChange={(open: boolean) => !open && setFormDialog({ open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formDialog.record ? "Edit Request" : "New Purchase Request"}</DialogTitle>
          </DialogHeader>
          <ProcurementForm
            record={formDialog.record}
            inventoryItems={inventoryItems}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormDialog({ open: false })}
          />
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No procurement records.</p>
              <Button variant="link" onClick={() => setFormDialog({ open: true })}>
                Create your first request
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Item Name</th>
                    <th className="text-right p-3 font-medium">Qty</th>
                    <th className="text-right p-3 font-medium">Unit Cost</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Supplier</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-medium uppercase tracking-tight text-xs">
                        {r.item_name || r.item_id?.slice(0, 8)}
                      </td>
                      <td className="p-3 text-right">
                        {r.requested_quantity} {r.unit}
                      </td>
                      <td className="p-3 text-right">{formatCurrency(r.unit_cost)}</td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(r.total_cost)}
                      </td>
                      <td className="p-3 text-muted-foreground">{r.supplier || "—"}</td>
                      <td className="p-3 text-center">{getStatusBadge(r.status)}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {r.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-green-600 hover:text-green-700"
                            onClick={() =>
                              updateStatusFast.mutate({ id: r.id, status: "approved" })
                            }
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {r.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-blue-600 hover:text-blue-700"
                            onClick={() =>
                              updateStatusFast.mutate({ id: r.id, status: "received" })
                            }
                            title="Mark Received"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        {r.status !== "received" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setFormDialog({ open: true, record: r })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Delete this procurement record?"))
                              deleteRecord.mutate(r.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
