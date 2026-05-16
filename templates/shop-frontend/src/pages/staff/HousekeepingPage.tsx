import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { HousekeepingTask, PaginatedResponse, ApiResponse } from "@/types/api";
import toast from "react-hot-toast";
import { Sparkles, Clock } from "lucide-react";

const priorityColors: Record<string, "default" | "warning" | "destructive" | "secondary"> = {
  low: "secondary",
  normal: "default",
  high: "warning",
  urgent: "destructive",
};

const statusNext: Record<string, string> = {
  pending: "in_progress",
  in_progress: "completed",
};

export default function HousekeepingPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.housekeepingTasks,
    queryFn: () => get<PaginatedResponse<HousekeepingTask>>("/housekeeping_tasks"),
    staleTime: 1000 * 30,
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HousekeepingTask> }) => {
      const response = await patch<ApiResponse<HousekeepingTask>>(`/housekeeping/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.housekeepingTasks });
      toast.success("Task updated");
    },
  });

  const tasks = data?.data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Housekeeping Tasks</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">All clear! No pending tasks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="housekeeping-list">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">
                        {task.room_name || `Room ${task.room_id.slice(0, 6)}`}
                      </p>
                      <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
                      <Badge variant="outline">{task.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {task.status.replace("_", " ")}
                      </span>
                      {task.assigned_name && <span>Assigned: {task.assigned_name}</span>}
                    </div>
                  </div>
                </div>
                {statusNext[task.status] && (
                  <Button
                    size="sm"
                    data-testid="update-task-button"
                    onClick={() =>
                      updateTask.mutate({
                        id: task.id,
                        data: { status: statusNext[task.status] as HousekeepingTask["status"] },
                      })
                    }
                    disabled={updateTask.isPending}
                  >
                    {task.status === "pending" ? "Start" : "Complete"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
