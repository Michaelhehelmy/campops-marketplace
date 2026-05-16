import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import type { InventoryItem, PaginatedResponse } from "@/types/api";
import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function stockStatus(item: InventoryItem): "normal" | "warning" | "critical" {
  if (item.quantity <= 0) return "critical";
  if (item.quantity <= item.reorder_point) return "warning";
  return "normal";
}

const statusBadge: Record<string, "success" | "warning" | "destructive"> = {
  normal: "success",
  warning: "warning",
  critical: "destructive",
};

export default function InventoryManagerPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.inventory,
    queryFn: () => get<PaginatedResponse<InventoryItem>>("/inventory"),
    staleTime: 1000 * 30,
  });

  const createItem = useMutation({
    mutationFn: (formData: FormData) => {
      const body: Record<string, unknown> = {};
      formData.forEach((v, k) => {
        body[k] = ["par_level", "quantity", "reorder_point", "cost"].includes(k) ? Number(v) : v;
      });
      return post("/inventory", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      toast.success("Item created");
      setShowForm(false);
    },
    onError: () => toast.error("Failed to create item"),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => del(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      toast.success("Item deleted");
    },
  });

  const items = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Button onClick={() => setShowForm(!showForm)} data-testid="add-item-btn">
          <Plus size={18} className="mr-2" /> Add Item
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createItem.mutate(new FormData(e.currentTarget));
              }}
              className="grid sm:grid-cols-3 gap-4"
            >
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required data-testid="item-name-input" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" required data-testid="item-category-input" />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  name="unit"
                  placeholder="e.g. kg, pcs"
                  required
                  data-testid="item-unit-input"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Current Stock</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                  data-testid="item-quantity-input"
                />
              </div>
              <div>
                <Label htmlFor="par_level">Par Level</Label>
                <Input id="par_level" name="par_level" type="number" min="0" required />
              </div>
              <div>
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input id="reorder_point" name="reorder_point" type="number" min="0" required />
              </div>
              <div>
                <Label htmlFor="cost">Cost/Unit</Label>
                <Input id="cost" name="cost" type="number" min="0" step="0.01" required />
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <Button type="submit" disabled={createItem.isPending} data-testid="save-item-btn">
                  Create
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
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No inventory items.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm" data-testid="inventory-table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Stock</th>
                <th className="text-right p-3 font-medium">Par</th>
                <th className="text-right p-3 font-medium">Cost/Unit</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.category}</td>
                  <td className="p-3 text-right">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="p-3 text-right">{item.par_level}</td>
                  <td className="p-3 text-right">${(Number(item.cost) || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <Badge variant={statusBadge[stockStatus(item)]}>{stockStatus(item)}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(item.id)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteItem.mutate(deleteConfirmId);
        }}
        title="Delete Item"
        description="Are you sure you want to delete this inventory item?"
      />
    </div>
  );
}
