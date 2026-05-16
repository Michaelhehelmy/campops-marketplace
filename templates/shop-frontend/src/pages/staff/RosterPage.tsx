import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { StaffShift, PaginatedResponse } from "@/types/api";
import { format } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";

const statusColors: Record<string, "default" | "success" | "warning" | "secondary"> = {
  scheduled: "default",
  active: "success",
  completed: "secondary",
  cancelled: "warning",
};

export default function RosterPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.shifts,
    queryFn: () => get<PaginatedResponse<StaffShift>>("/staff_shifts"),
    staleTime: 1000 * 60,
  });

  const shifts = data?.data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Staff Roster</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shifts scheduled.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{shift.user_name || "Staff Member"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{shift.role}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {format(new Date(shift.date), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {shift.start_time} — {shift.end_time}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={statusColors[shift.status]}>{shift.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
