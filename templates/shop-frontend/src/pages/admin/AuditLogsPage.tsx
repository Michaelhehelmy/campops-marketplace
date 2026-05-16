import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import type { AuditLog } from "@/types/api";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params = new URLSearchParams({
    limit: PAGE_SIZE.toString(),
    offset: offset.toString(),
    order: "created_at",
    asc: "false",
  });
  if (actionFilter) params.set("action", actionFilter);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.auditLogs, offset, actionFilter, dateFrom, dateTo],
    queryFn: () => get<AuditLog[]>(`/audit-logs?${params.toString()}`),
  });

  const logs = data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Action Search</label>
              <Input
                placeholder="e.g. create, delete, search..."
                value={actionFilter}
                data-testid="audit-action-filter"
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                data-testid="audit-from-date"
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                data-testid="audit-to-date"
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <Button
              variant="outline"
              data-testid="audit-clear-filters"
              onClick={() => {
                setActionFilter("");
                setDateFrom("");
                setDateTo("");
                setOffset(0);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card data-testid="audit-empty-state">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No audit logs found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Log Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm" data-testid="audit-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Resource</th>
                    <th className="py-2 pr-4">Resource ID</th>
                    <th className="py-2">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                      </td>
                      <td className="py-2 pr-4">
                        {log.user_email || log.user_id?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="py-2 pr-4">{log.resource_type}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {log.resource_id?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-2 font-mono text-xs">{log.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {offset + 1}–{offset + logs.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  <ChevronLeft size={16} /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logs.length < PAGE_SIZE}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
