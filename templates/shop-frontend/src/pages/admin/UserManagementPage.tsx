import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UserAdmin, PaginatedResponse } from "@/types/api";
import { Users, Plus, Pencil, Trash2, CheckCircle, Search } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function UserManagementPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => get<PaginatedResponse<UserAdmin>>("/users"),
    staleTime: 1000 * 30,
  });

  const createUser = useMutation({
    mutationFn: (formData: FormData) => {
      const body = Object.fromEntries(formData);
      return post("/users", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      toast.success("User created");
      setShowForm(false);
    },
    onError: () => toast.error("Failed to create user"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => del(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      toast.success("User deleted");
    },
    onError: () => toast.error("Failed to delete user"),
  });

  const toggleVerify = useMutation({
    mutationFn: ({ id, is_verified }: { id: string; is_verified: boolean }) =>
      post(`/users/${id}/verify`, { is_verified }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      toast.success("User verification updated");
    },
    onError: () => toast.error("Failed to update verification"),
  });

  const users = (Array.isArray(data) ? data : (data as any)?.data || []) as UserAdmin[];
  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setShowForm(!showForm)} data-testid="add-user-btn">
          <Plus size={18} className="mr-2" /> Add User
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate(new FormData(e.currentTarget));
              }}
              className="grid sm:grid-cols-2 gap-4"
            >
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" required data-testid="user-full-name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required data-testid="user-email" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  data-testid="user-password"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  name="role"
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="guest">Guest</option>
                  <option value="chef">Chef</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="pos">POS</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={createUser.isPending} data-testid="submit-user-btn">
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

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm" data-testid="users-table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.full_name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Badge variant="outline">{u.role}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant={u.is_active ? "success" : "secondary"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        variant={u.is_verified ? "success" : "warning"}
                        data-testid={`verify-status-${u.id}`}
                      >
                        {u.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {!u.is_verified && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Verify User"
                          onClick={() => toggleVerify.mutate({ id: u.id, is_verified: true })}
                          data-testid={`verify-user-btn-${u.id}`}
                        >
                          <CheckCircle size={16} className="text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Edit">
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        data-testid="delete-user-btn"
                        onClick={() => setDeleteConfirmId(u.id)}
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
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
          if (deleteConfirmId) deleteUser.mutate(deleteConfirmId);
        }}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
      />
    </div>
  );
}
