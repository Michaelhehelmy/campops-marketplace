/**
 * Staff Profile Page
 * View and edit own profile information (name, bio)
 * Shows role and permissions as read-only
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { staffProfileSchema, type StaffProfileFormData } from "@/lib/validation";
import type { StaffProfile, ApiResponse } from "@/types/api";
import toast from "react-hot-toast";

export default function StaffProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["staff-profile"],
    queryFn: async () => {
      const response = await get<ApiResponse<StaffProfile>>("/guests/me");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // The generic CRUD self-filter returns only our own profile
  const profile = (Array.isArray(profiles) ? profiles[0] : profiles) ?? null;

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffProfile> }) => {
      return put(`/profiles/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.staffProfile });
      qc.invalidateQueries({ queryKey: queryKeys.user });
      toast.success("Profile updated");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<StaffProfileFormData>({
    resolver: zodResolver(staffProfileSchema),
    values: profile
      ? {
          full_name: profile.full_name || "",
          bio: profile.bio || "",
        }
      : {
          full_name: "",
          bio: "",
        },
  });

  const onSubmit = (data: StaffProfileFormData) => {
    if (!profile) return;
    updateMutation.mutate({ id: profile.id, data });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold" data-testid="profile-heading">
        My Profile
      </h1>

      {/* Role & Permissions (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
          <CardDescription>Your role and permissions (managed by admin)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground w-24">Email</span>
            <span className="text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground w-24">Role</span>
            <Badge variant="outline" className="capitalize">
              {user?.role}
            </Badge>
          </div>
          {user?.permissions && user.permissions.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted-foreground w-24 pt-0.5">
                Permissions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.slice(0, 20).map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p}
                  </Badge>
                ))}
                {user.permissions.length > 20 && (
                  <Badge variant="secondary" className="text-xs">
                    +{user.permissions.length - 20} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editable Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your display name and bio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" {...register("full_name")} data-testid="full-name-input" />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                data-testid="bio-input"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us about yourself..."
                {...register("bio")}
              />
              {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              data-testid="save-profile-btn"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
