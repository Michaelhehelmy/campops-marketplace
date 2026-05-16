import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Role } from "@/types/api";
import { Shield } from "lucide-react";

export default function RolesPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => get<{ data: Role[] }>("/roles"),
    staleTime: 1000 * 60 * 5,
  });

  const roles = data?.data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Roles</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No roles defined.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4" data-testid="roles-grid">
          {roles.map((role) => (
            <Card key={role.id} data-testid={`role-card-${role.id}`}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  {role.is_system && <Badge variant="secondary">System</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {role.description && (
                  <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
