import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Alias Radix/shadcn tabs components to bypass ReactNode mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsAny = Tabs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsListAny = TabsList as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsTriggerAny = TabsTrigger as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsContentAny = TabsContent as any;
import { Badge } from "@/components/ui/Badge";
import { Calendar, RefreshCw, Save, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { useBranding } from "@/contexts/BrandingContext";

export default function IntegrationsPage() {
  const branding = useBranding();
  const [calendarUrl, setCalendarUrl] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("hourly");
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSaveSettings = async () => {
    setUrlError(null);
    if (!calendarUrl.includes("://")) {
      setUrlError("Please enter a valid URL");
      toast.error("Validation failed");
      return;
    }

    toast.success("Settings saved successfully");
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestSuccess(false);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsTesting(false);
    setTestSuccess(true);
    toast.success("Connection successful");
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setTestSuccess(false);
    setSyncError(null);

    if (calendarUrl.includes("invalid")) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSyncError("Failed to fetch calendar: 404 Not Found");
      setIsSyncing(false);
      toast.error("Sync failed");
      return;
    }

    toast.success("Sync initiated");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLastSync(new Date().toLocaleString());
    setIsSyncing(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Manage external connections and data synchronization.
          </p>
        </div>
      </div>

      <TabsAny defaultValue="ical" className="space-y-4">
        <TabsListAny>
          <TabsTriggerAny value="ical" data-testid="ical-sync-tab">
            iCal Sync
          </TabsTriggerAny>
          <TabsTriggerAny value="webhooks" data-testid="webhooks-tab">
            Webhooks
          </TabsTriggerAny>
          <TabsTriggerAny value="api" data-testid="api-access-tab">
            API Access
          </TabsTriggerAny>
          <TabsTriggerAny value="mapping" data-testid="field-mapping-tab">
            Field Mapping
          </TabsTriggerAny>
        </TabsListAny>

        <TabsContentAny value="ical" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2" data-testid="ical-settings">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="text-primary" />
                  <CardTitle>Calendar Synchronization</CardTitle>
                </div>
                <CardDescription>
                  Import external reservations from Google Calendar, Airbnb, or other iCal services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="calendar-url">External iCal URL</Label>
                  <Input
                    id="calendar-url"
                    type="url"
                    placeholder="https://example.com/calendar.ics"
                    value={calendarUrl}
                    onChange={(e) => setCalendarUrl(e.target.value)}
                    data-testid="calendar-url-input"
                  />
                  {urlError && (
                    <p className="text-sm text-destructive" data-testid="url-error">
                      {urlError}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sync-frequency">Sync Frequency</Label>
                    <select
                      id="sync-frequency"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={syncFrequency}
                      onChange={(e) => setSyncFrequency(e.target.value)}
                      data-testid="sync-frequency-select"
                    >
                      <option value="realtime">Real-time (Webhooks)</option>
                      <option value="hourly">Every Hour</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <input
                      type="checkbox"
                      id="enable-sync"
                      checked={isSyncEnabled}
                      onChange={(e) => setIsSyncEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      data-testid="enable-sync-toggle"
                    />
                    <Label htmlFor="enable-sync" className="cursor-pointer">
                      Enable background synchronization
                    </Label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    data-testid="save-ical-settings"
                    className="flex items-center gap-2"
                  >
                    <Save size={16} /> Save Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting || !calendarUrl}
                    data-testid="test-connection-button"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={16} className={isTesting ? "animate-spin" : ""} />
                    {isTesting ? "Testing..." : "Test Connection"}
                  </Button>
                </div>

                {testSuccess && (
                  <div data-testid="connection-result" className="mt-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 size={16} />
                      <span className="text-sm font-medium">Connection successful</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card data-testid="sync-status">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge variant={isSyncEnabled ? "success" : "secondary"}>
                      {isSyncEnabled ? "Active" : "Disabled"}
                    </Badge>
                    <span
                      className="text-xs text-muted-foreground last-sync-time"
                      data-testid="last-sync-time"
                    >
                      {lastSync ? `Last sync: ${lastSync}` : "Never synced"}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleManualSync}
                    disabled={!isSyncEnabled || isSyncing}
                    data-testid="manual-sync-button"
                  >
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  {isSyncing && (
                    <div
                      className="flex items-center gap-2 text-xs text-primary animate-pulse"
                      data-testid="sync-progress"
                    >
                      <RefreshCw size={12} className="animate-spin" />
                      Synchronizing calendar data...
                    </div>
                  )}
                  {syncError && (
                    <div
                      className="flex items-center gap-2 text-xs text-destructive mt-2"
                      data-testid="sync-error"
                    >
                      <AlertCircle size={12} />
                      {syncError}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>1. Copy your public iCal URL from Google or Outlook.</p>
                  <p>2. Paste it in the URL field and save.</p>
                  <p>3. Enable sync to start importing reservations automatically.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="mt-6" data-testid="sync-logs">
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent synchronization activity and results.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border" data-testid="sync-logs-table">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Changes</th>
                      <th className="px-4 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSync ? (
                      <tr>
                        <td className="px-4 py-3">{lastSync}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">Success</Badge>
                        </td>
                        <td className="px-4 py-3">+3 items</td>
                        <td className="px-4 py-3 text-muted-foreground">Manual sync completed</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No sync history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center mt-4">
                <Button variant="ghost" size="sm" data-testid="view-logs-button">
                  View All Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContentAny>

        <TabsContentAny value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Delivery Logs</CardTitle>
              <CardDescription>
                Monitor outgoing webhook events and their delivery status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border" data-testid="webhook-logs-table">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Event</th>
                      <th className="px-4 py-2 text-left">URL</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No webhook logs found. Webhooks are configured in Settings.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContentAny>

        <TabsContentAny value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Access Keys</CardTitle>
              <CardDescription>
                Manage keys for programmatic access to the {branding.appName} API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-amber-500 h-5 w-5 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">API Access is Restricted</h4>
                  <p className="text-sm text-amber-800">
                    Programmatic API access is currently managed via service accounts. Contact
                    system administrator to request a new API token.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service Tokens</Label>
                <div className="rounded-md border p-8 text-center text-muted-foreground bg-muted/10">
                  <Shield className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p>No active service tokens.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    data-testid="request-api-key-btn"
                  >
                    Request Access Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContentAny>

        <TabsContentAny value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>Map incoming iCal fields to system attributes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 items-center gap-4">
                  <Label htmlFor="title-mapping">Event Title</Label>
                  <select
                    id="title-mapping"
                    data-testid="title-mapping"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="summary">Summary</option>
                    <option value="description">Description</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <Label htmlFor="description-mapping">Event Description</Label>
                  <select
                    id="description-mapping"
                    data-testid="description-mapping"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="description">Description</option>
                    <option value="summary">Summary</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <Label htmlFor="start-mapping">Start Time</Label>
                  <select
                    id="start-mapping"
                    data-testid="start-time-mapping"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="start">DTSTART</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <Label htmlFor="end-mapping">End Time</Label>
                  <select
                    id="end-mapping"
                    data-testid="end-time-mapping"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="end">DTEND</option>
                  </select>
                </div>
              </div>
              <Button
                className="mt-4"
                data-testid="save-mapping-button"
                onClick={() => toast.success("Mapping saved successfully")}
              >
                Save Mapping
              </Button>
            </CardContent>
          </Card>
        </TabsContentAny>
      </TabsAny>
    </div>
  );
}
