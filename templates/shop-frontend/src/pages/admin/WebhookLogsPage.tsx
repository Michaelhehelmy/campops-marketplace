import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WebhookLog } from "@/types/api";
import { Webhook, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function WebhookLogsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.webhookLogs,
    queryFn: () => get<WebhookLog[]>("/webhooks"),
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => post(`/webhooks/${id}/retry`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webhookLogs });
      toast.success("Webhook retried");
    },
    onError: () => toast.error("Retry failed"),
  });

  const logs = data ?? [];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Webhook Logs</h1>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="webhook-logs-heading">
          Webhook Logs
        </h1>
        <Button
          variant="outline"
          data-testid="refresh-webhooks-button"
          onClick={() => qc.invalidateQueries({ queryKey: queryKeys.webhookLogs })}
        >
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No webhook deliveries found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">URL</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Result</th>
                    <th className="py-2 pr-4">Retries</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{log.event}</Badge>
                      </td>
                      <td className="py-2 pr-4 max-w-[200px] truncate font-mono text-xs">
                        {log.url}
                      </td>
                      <td className="py-2 pr-4">{log.response_status ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={log.success ? "success" : "destructive"}>
                          {log.success ? "Success" : "Failed"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-center">{log.retry_count}</td>
                      <td className="py-2">
                        {!log.success && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryMut.mutate(log.id)}
                            disabled={retryMut.isPending}
                          >
                            <RefreshCw size={14} className="mr-1" /> Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
