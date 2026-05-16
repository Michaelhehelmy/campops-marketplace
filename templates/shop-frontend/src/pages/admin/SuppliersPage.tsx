/**
 * Suppliers Management Page
 * CRUD for suppliers via generic CRUD: GET/POST/PUT/DELETE /api/suppliers
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Supplier } from "@/types/api";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const QUERY_KEY = ["suppliers"] as const;

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => get<Supplier[]>("/suppliers"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Supplier> & { id?: string }) => {
      if (data.id) return put(`/suppliers/${data.id}`, data);
      return post("/suppliers", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(editing ? "Supplier updated" : "Supplier created");
      resetForm();
    },
    onError: () => toast.error("Failed to save supplier"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Supplier deleted");
    },
    onError: () => toast.error("Failed to delete supplier"),
  });

  const resetForm = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Partial<Supplier> & { id?: string } = {
      name: fd.get("name") as string,
      category: (fd.get("category") as string) || undefined,
      contact_email: (fd.get("contact_email") as string) || undefined,
      rating: Number(fd.get("rating")) || 0,
      reliability: Number(fd.get("reliability")) || 0,
      status: (fd.get("status") as string) || "active",
    };
    if (editing) data.id = editing.id;
    saveMutation.mutate(data);
  };

  const items = suppliers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your ingredient and service providers</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(!showForm);
          }}
          data-testid="add-supplier-button"
        >
          {showForm ? "Cancel" : "Add Supplier"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? "Edit Supplier" : "New Supplier"}</CardTitle>
            <CardDescription>Manage supplier information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="supplier-form">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editing?.name || ""}
                    required
                    data-testid="supplier-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editing?.category || ""}
                    placeholder="e.g. Produce, Beverages"
                    data-testid="supplier-category-input"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={editing?.contact_email || ""}
                    data-testid="supplier-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (0-5)</Label>
                  <Input
                    id="rating"
                    name="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    defaultValue={editing?.rating || 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reliability">Reliability (%)</Label>
                  <Input
                    id="reliability"
                    name="reliability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editing?.reliability || 0}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue={editing?.status || "active"}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="py-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    data-testid="save-supplier-button"
                  >
                    {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No suppliers yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Category</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Rating</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Reliability</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Total Spent</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 pr-4 font-medium">{s.name}</td>
                        <td className="py-3 pr-4">{s.category || "—"}</td>
                        <td className="py-3 pr-4">{Number(s.rating).toFixed(1)} / 5</td>
                        <td className="py-3 pr-4">{s.reliability}%</td>
                        <td className="py-3 pr-4">${Number(s.total_spent).toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={s.status === "active" ? "success" : "secondary"}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(s);
                                setShowForm(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(s.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
        }}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier?"
      />
    </div>
  );
}
