import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Server,
  HardDrive,
  Database,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

interface SystemInfo {
  status: string;
  uptime: number;
  environment: string;
  version: string;
  database: {
    status: string;
    connection_count: number;
    db_size?: string;
  };
  memory: {
    total: number;
    free: number;
    used: number;
  };
}

interface Backup {
  id: string;
  filename: string;
  path: string;
  size_bytes: number;
  type: string;
  status: string;
  created_at: string;
}

export default function SystemAdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch System Info
  const {
    data: sysInfo,
    isLoading: sysInfoLoading,
    refetch: refetchSysInfo,
  } = useQuery({
    queryKey: queryKeys.systemInfo,
    queryFn: () => get<SystemInfo>("/system/info"),
    refetchInterval: 30000,
  });

  // Fetch Backups
  const { data: backupData, isLoading: backupsLoading } = useQuery({
    queryKey: queryKeys.systemBackups,
    queryFn: () => get<{ data: Backup[] }>("/system/backups"),
  });
  const backups = backupData?.data || [];

  // Mutations
  const clearCacheMutation = useMutation({
    mutationFn: () => post("/system/clear-cache"),
    onSuccess: () => {
      toast({ title: "Application cache cleared successfully" });
      refetchSysInfo();
    },
    onError: () => toast({ title: "Failed to clear cache", variant: "destructive" }),
  });

  const generateBackupMutation = useMutation({
    mutationFn: () => post("/system/backup"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systemBackups });
      toast({ title: "Backup generated successfully" });
    },
    onError: () => toast({ title: "Failed to generate backup", variant: "destructive" }),
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (id: string) => post(`/system/restore/${id}`),
    onSuccess: () => {
      toast({ title: "System restored from backup successfully" });
    },
    onError: () => toast({ title: "Failed to restore backup", variant: "destructive" }),
  });

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8 text-primary" />
            System Administration
          </h1>
          <p className="text-muted-foreground">
            Monitor server health, manage backups, and clear caches.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2"
            data-testid="system-overview-tab"
          >
            <Activity className="h-4 w-4" />
            System Overview
          </TabsTrigger>
          <TabsTrigger
            value="backups"
            className="flex items-center gap-2"
            data-testid="system-backups-tab"
          >
            <Database className="h-4 w-4" />
            Database & Backups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {sysInfoLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : sysInfo ? (
            <>
              {/* Server Status Metrics */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card data-testid="system-status-card">
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    {sysInfo.status === "ok" ? (
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                    ) : (
                      <AlertTriangle className="h-12 w-12 text-amber-500 mb-2" />
                    )}
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
                      System Status
                    </h3>
                    <p className="text-sm text-muted-foreground uppercase tracking-widest">
                      {sysInfo.status}
                    </p>
                    <div className="mt-4 w-full flex justify-between text-sm">
                      <span className="text-muted-foreground">Environment:</span>
                      <span className="font-semibold capitalize">{sysInfo.environment}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="system-uptime-card">
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <Clock className="h-12 w-12 text-blue-500 mb-2" />
                    <h3 className="text-xl font-bold">Server Uptime</h3>
                    <p className="text-sm text-muted-foreground">Continuous Operation</p>
                    <div className="mt-4 px-4 py-2 bg-muted rounded-md font-mono text-lg font-bold w-full">
                      {formatUptime(sysInfo.uptime)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <HardDrive className="h-12 w-12 text-purple-500 mb-2" />
                    <h3 className="text-xl font-bold">Memory Usage</h3>
                    <p className="text-sm text-muted-foreground">Node.js Process</p>
                    <div className="mt-4 w-full flex justify-between text-sm items-center border-b pb-2">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="font-semibold">
                        {sysInfo.memory ? formatBytes(sysInfo.memory.used) : "N/A"}
                      </span>
                    </div>
                    <div className="mt-2 w-full flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Free:</span>
                      <span className="font-semibold">
                        {sysInfo.memory ? formatBytes(sysInfo.memory.free) : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* System Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>System Utility Actions</CardTitle>
                  <CardDescription>
                    Perform administrative commands on your infrastructure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div>
                      <h4 className="font-medium">Clear Application Cache</h4>
                      <p className="text-sm text-muted-foreground">
                        Purge temporary cache. Useful if UI configurations are not reflecting
                        correctly.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      data-testid="clear-cache-button"
                      onClick={() => {
                        if (confirm("Are you sure you want to clear system cache?")) {
                          clearCacheMutation.mutate();
                        }
                      }}
                      disabled={clearCacheMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-8 text-center border border-destructive/20 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <h3 className="font-bold">Failed to load system info</h3>
              <p>Could not connect to the administration API.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Database Backups</CardTitle>
                <CardDescription>
                  Manage and restore snapshots of your Postgres database.
                </CardDescription>
              </div>
              <Button
                onClick={() => generateBackupMutation.mutate()}
                disabled={generateBackupMutation.isPending}
                data-testid="generate-snapshot-button"
              >
                <Database className="h-4 w-4 mr-2" />
                Generate Snapshot
              </Button>
            </CardHeader>
            <CardContent>
              {backupsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p>No backups available yet.</p>
                  <Button variant="link" onClick={() => generateBackupMutation.mutate()}>
                    Generate your first backup
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm text-left" data-testid="backups-table">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Backup File</th>
                        <th className="px-4 py-3 font-medium">Date Created</th>
                        <th className="px-4 py-3 font-medium">Size</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {backups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium font-mono text-xs">
                            {backup.filename}
                          </td>
                          <td className="px-4 py-3">
                            {format(new Date(backup.created_at), "MMM d, yyyy HH:mm")}
                          </td>
                          <td className="px-4 py-3">{formatBytes(backup.size_bytes)}</td>
                          <td className="px-4 py-3 uppercase text-xs">{backup.type}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={backup.status === "completed" ? "success" : "secondary"}
                            >
                              {backup.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`restore-backup-${backup.id}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    "WARNING: All current data will be overwritten by this backup. Continue?"
                                  )
                                ) {
                                  restoreBackupMutation.mutate(backup.id);
                                }
                              }}
                              disabled={
                                restoreBackupMutation.isPending || backup.status !== "completed"
                              }
                            >
                              <Play className="h-3 w-3 mr-1" /> Restore
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
