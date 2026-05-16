/**
 * Waste Management Page
 * Log waste events and view history
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WasteLogEntry, InventoryItem } from "@/types/api";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { format } from "date-fns";

const QUERY_KEY = ["waste"] as const;

export default function WastePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterReason, setFilterReason] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: wasteEntries, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => get<WasteLogEntry[]>("/waste"),
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => get<InventoryItem[]>("/inventory"),
  });

  const logMutation = useMutation({
    mutationFn: (data: Partial<WasteLogEntry>) => post("/waste", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Waste logged successfully");
      setShowForm(false);
    },
    onError: () => toast.error("Failed to log waste"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/waste/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Entry removed");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    logMutation.mutate({
      inventory_item_id: (fd.get("inventory_item_id") as string) || undefined,
      item: (fd.get("item") as string) || undefined,
      quantity: Number(fd.get("quantity")),
      unit: (fd.get("unit") as string) || "unit",
      reason: (fd.get("reason") as string) || "Not specified",
      cost: Number(fd.get("cost")) || 0,
      date: (fd.get("date") as string) || new Date().toISOString().split("T")[0],
    });
  };

  const entries = Array.isArray(wasteEntries) ? wasteEntries.filter(Boolean) : [];
  const items = Array.isArray(inventoryItems) ? inventoryItems.filter(Boolean) : [];

  const filtered = filterReason
    ? entries.filter((e) => (e?.reason || "").toLowerCase().includes(filterReason.toLowerCase()))
    : entries;

  const totalCost = filtered.reduce((sum, e) => sum + Number(e?.cost || 0), 0);

  return (
    <div className="space-y-6" data-testid="waste-page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="waste-page-heading">
          Waste Log
        </h1>
        <Button onClick={() => setShowForm(true)} data-testid="log-waste-button">
          Log Waste
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle data-testid="waste-form-title">Log New Waste</CardTitle>
            <CardDescription>
              Record a waste event — inventory stock will be automatically deducted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="waste-form">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventory_item_id">Inventory Item</Label>
                  <select
                    id="inventory_item_id"
                    name="inventory_item_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="waste-item-select"
                  >
                    <option value="">Select item (or type name below)</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item">Or Item Name (if not in inventory)</Label>
                  <Input id="item" name="item" placeholder="Item name..." />
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    required
                    data-testid="waste-quantity-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" name="unit" defaultValue="unit" placeholder="kg, pcs, L" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input id="cost" name="cost" type="number" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <select
                  id="reason"
                  name="reason"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select reason...</option>
                  <option value="Spoilage">Spoilage</option>
                  <option value="Expiration">Expiration</option>
                  <option value="Damage">Damage</option>
                  <option value="Preparation Waste">Preparation Waste</option>
                  <option value="Plate Waste">Plate Waste</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-2 py-2">
                <Button
                  type="submit"
                  disabled={logMutation.isPending}
                  data-testid="submit-waste-button"
                >
                  {logMutation.isPending ? "Logging..." : "Log Waste Entry"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Entries</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Waste Cost</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">${totalCost.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg per Entry</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${filtered.length > 0 ? (totalCost / filtered.length).toFixed(2) : "0.00"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Waste History</h2>
                <div className="flex gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                  >
                    <option value="">All Reasons</option>
                    <option value="Spoilage">Spoilage</option>
                    <option value="Expiration">Expiration</option>
                    <option value="Damage">Damage</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="waste-history-table">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Item</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Quantity</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Reason</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Cost</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr
                        key={entry?.id || Math.random()}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="p-3 text-sm">
                          {(() => {
                            try {
                              if (!entry?.date) return "-";
                              return format(new Date(entry.date), "MMM d, HH:mm");
                            } catch (e) {
                              return String(entry?.date || "-");
                            }
                          })()}
                        </td>
                        <td className="p-3">{String(entry?.item || "Unknown")}</td>
                        <td className="p-3 text-right text-sm">
                          {entry?.quantity || 0} {entry?.unit || ""}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">
                            {String(entry?.reason || "Other")}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium text-sm">
                          ${Number(entry?.cost || 0).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteConfirmId(entry?.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        title="Delete Waste Entry"
        description="Are you sure you want to delete this waste log entry?"
      />
    </div>
  );
}
