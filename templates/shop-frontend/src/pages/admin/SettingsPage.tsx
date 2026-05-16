import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Setting, TaxConfiguration, ApiResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Save, Plus, Trash2, Webhook, Music, Receipt, Cog, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { usePluginSettingsTabs } from "@/lib/pluginRegistry";
import { PluginSlot, Slots } from "@/components/PluginSlot";
import { useSearchParams } from "react-router-dom";

type TabKey = "general" | "tax" | "loyalty" | "webhook" | "public_website";

const LOYALTY_KEYS = [
  { key: "loyalty_points_name", label: "Points Name", type: "string", default: "Beats" },
  { key: "loyalty_points_symbol", label: "Points Symbol", type: "string", default: "♪" },
  { key: "loyalty_points_exchange_rate", label: "Points per USD", type: "number", default: "100" },
  { key: "loyalty_points_earn_percent", label: "Earn % of Spend", type: "number", default: "5" },
  { key: "loyalty_vip_multiplier", label: "VIP Multiplier", type: "number", default: "2" },
  {
    key: "loyalty_max_redeem_percent",
    label: "Max Redeem % (0-100)",
    type: "number",
    default: "50",
  },
  { key: "loyalty_min_redeem_points", label: "Min Redeem Points", type: "number", default: "100" },
  { key: "loyalty_mining_enabled", label: "Mining Enabled", type: "boolean", default: "false" },
  {
    key: "loyalty_mining_base_rate",
    label: "Mining Base Rate (pts/hr)",
    type: "number",
    default: "10",
  },
  {
    key: "loyalty_mining_max_hours_per_day",
    label: "Mining Max Hours/Day",
    type: "number",
    default: "8",
  },
  {
    key: "loyalty_mining_monthly_budget",
    label: "Mining Monthly Budget",
    type: "number",
    default: "10000",
  },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const pluginTabs = usePluginSettingsTabs();

  const activeTab = (searchParams.get("tab") as TabKey) || "general";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const [values, setValues] = useState<Record<string, string>>({});
  const [taxDialog, setTaxDialog] = useState<{ open: boolean; tax?: TaxConfiguration }>({
    open: false,
  });
  const [taxForm, setTaxForm] = useState({ name: "", rate: "", is_compulsory: true });

  // General settings
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await get<ApiResponse<Setting[]>>("/settings?format=array");
      return response.data; // Type: Setting[]
    },
    staleTime: 1000 * 60 * 5,
  });

  const settings = (data as Setting[]) ?? [];

  // Tax configurations
  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: queryKeys.taxConfigurations,
    queryFn: () => get<TaxConfiguration[]>("/tax_configurations"),
    enabled: activeTab === "tax",
  });

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach((s: Setting) => {
        map[s.key] = s.value;
      });
      // Set defaults for loyalty keys
      LOYALTY_KEYS.forEach((lk) => {
        if (!map[lk.key]) map[lk.key] = lk.default;
      });
      setValues(map);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (entries: { key: string; value: string }[]) =>
      put("/settings", { settings: entries }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const updateTaxMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxConfiguration> }) =>
      put(`/tax_configurations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.taxConfigurations });
      toast.success("Tax configuration updated");
      setTaxDialog({ open: false });
    },
    onError: () => toast.error("Failed to update tax"),
  });

  const createTaxMut = useMutation({
    mutationFn: (d: { name: string; rate: number; is_compulsory: boolean }) =>
      post("/tax_configurations", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.taxConfigurations });
      toast.success("Tax configuration created");
      setTaxDialog({ open: false });
      setTaxForm({ name: "", rate: "", is_compulsory: true });
    },
    onError: () => toast.error("Failed to create tax"),
  });

  const deleteTaxMut = useMutation({
    mutationFn: (id: string) => del(`/tax_configurations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.taxConfigurations });
      toast.success("Tax configuration deleted");
    },
  });

  const toggleTaxMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      put(`/tax_configurations/${id}`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.taxConfigurations });
      toast.success("Tax updated");
    },
  });

  const generalCategories = [
    ...new Set(
      settings
        .filter(
          (s: Setting) =>
            !s.key.startsWith("loyalty_") &&
            s.key !== "n8n_webhook_url" &&
            s.category !== "public_website"
        )
        .map((s: Setting) => s.category)
    ),
  ] as string[];

  const handleSave = () => {
    const entries = Object.entries(values).map(([key, value]) => ({ key, value }));
    saveMutation.mutate(entries);
  };

  const tabs = [
    { key: "general" as const, label: "General", icon: Cog },
    { key: "public_website" as const, label: "Public Website", icon: Settings },
    { key: "tax" as const, label: "Tax Config", icon: Receipt },
    { key: "loyalty" as const, label: "Loyalty (Beats)", icon: Music },
    { key: "webhook" as const, label: "Webhook", icon: Webhook },
  ];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        {(activeTab === "general" ||
          activeTab === "loyalty" ||
          activeTab === "webhook" ||
          activeTab === "public_website") && (
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="save-settings-btn"
          >
            <Save size={18} className="mr-2" /> Save All
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto custom-scrollbar">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={activeTab === t.key ? "default" : "ghost"}
            onClick={() => setActiveTab(t.key)}
            className="gap-2 shrink-0"
            data-testid={`${t.key}-tab`}
          >
            <t.icon size={16} /> {t.label}
          </Button>
        ))}
        {pluginTabs.map((pt) => (
          <Button
            key={pt.id}
            variant={activeTab === pt.id ? "default" : "ghost"}
            onClick={() => setActiveTab(pt.id)}
            className="gap-2 shrink-0 border-l pl-4 ml-2"
            data-testid={`plugin-tab-${pt.id}`}
          >
            <Settings size={16} className="opacity-50" /> {pt.label}
          </Button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" &&
        (generalCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No general settings found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {generalCategories.map((cat) => (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{cat}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {settings
                      .filter(
                        (s: Setting) =>
                          s.category === cat &&
                          !s.key.startsWith("loyalty_") &&
                          s.key !== "n8n_webhook_url"
                      )
                      .map((s: Setting) => (
                        <div key={s.key}>
                          <Label htmlFor={s.key} className="text-xs">
                            {s.description || s.key}
                          </Label>
                          {s.type === "boolean" ? (
                            <select
                              id={s.key}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={values[s.key] || "false"}
                              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                            >
                              <option value="true">Enabled</option>
                              <option value="false">Disabled</option>
                            </select>
                          ) : s.key.includes("_url") || s.key.includes("_image") ? (
                            <div className="space-y-2">
                              <Input
                                id={s.key}
                                value={values[s.key] || ""}
                                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                                placeholder="https://..."
                              />
                              {(values[s.key] || "").startsWith("http") && (
                                <div className="h-20 w-32 rounded-lg overflow-hidden border border-input">
                                  <img
                                    src={values[s.key]}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          ) : s.key === "features_config" ? (
                            <div className="space-y-2">
                              <textarea
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                                value={values[s.key] || ""}
                                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                                placeholder='[{"title": "...", "desc": "...", "img": "..."}]'
                              />
                              <p className="text-[10px] text-muted-foreground">
                                JSON format: Array of objects with title, desc, img keys
                              </p>
                            </div>
                          ) : (
                            <Input
                              id={s.key}
                              value={values[s.key] || ""}
                              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                              type={s.type === "number" ? "number" : "text"}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      {/* Tax Configuration Tab */}
      {activeTab === "tax" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Tax Configurations</h2>
              <p className="text-sm text-muted-foreground">Manage applicable taxes and levies.</p>
            </div>
            <Button
              onClick={() => {
                setTaxForm({ name: "", rate: "", is_compulsory: true });
                setTaxDialog({ open: true });
              }}
              data-testid="add-tax-button"
            >
              <Plus size={18} className="mr-2" /> Add Tax
            </Button>
          </div>

          <Dialog open={taxDialog.open} onOpenChange={(open: boolean) => setTaxDialog({ open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{taxDialog.tax ? "Edit Tax" : "Add Tax"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (taxDialog.tax) {
                    updateTaxMut.mutate({
                      id: taxDialog.tax.id,
                      data: {
                        name: taxForm.name,
                        rate: parseFloat(taxForm.rate),
                        is_compulsory: taxForm.is_compulsory,
                      },
                    });
                  } else {
                    createTaxMut.mutate({
                      name: taxForm.name,
                      rate: parseFloat(taxForm.rate),
                      is_compulsory: taxForm.is_compulsory,
                    });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Tax Name</Label>
                  <Input
                    value={taxForm.name}
                    onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                    placeholder="e.g. VAT"
                    required
                    data-testid="tax-name-input"
                  />
                </div>
                <div>
                  <Label>Rate (%)</Label>
                  <Input
                    type="number"
                    value={taxForm.rate}
                    onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    data-testid="tax-rate-input"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_compulsory"
                    checked={taxForm.is_compulsory}
                    onChange={(e) => setTaxForm({ ...taxForm, is_compulsory: e.target.checked })}
                    data-testid="tax-compulsory-checkbox"
                  />
                  <Label htmlFor="is_compulsory">Compulsory</Label>
                </div>
                <div className="pt-4 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTaxDialog({ open: false })}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTaxMut.isPending || updateTaxMut.isPending}
                    data-testid="tax-submit-button"
                  >
                    {taxDialog.tax ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {taxLoading ? (
            <div className="space-y-2 flex flex-col">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !taxData || taxData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tax configurations defined.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tax Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Compulsory</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxData.map((tax) => (
                      <TableRow key={tax.id}>
                        <TableCell className="font-medium">{tax.name}</TableCell>
                        <TableCell>{tax.rate}%</TableCell>
                        <TableCell>
                          <Badge variant={tax.is_active ? "success" : "secondary"}>
                            {tax.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tax.is_compulsory ? (
                            <Badge variant="outline">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleTaxMut.mutate({ id: tax.id, is_active: !tax.is_active })
                              }
                              title={tax.is_active ? "Disable" : "Enable"}
                              data-testid={`toggle-tax-${tax.name.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              {tax.is_active ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTaxDialog({ open: true, tax });
                                setTaxForm({
                                  name: tax.name,
                                  rate: String(tax.rate),
                                  is_compulsory: tax.is_compulsory,
                                });
                              }}
                              data-testid={`edit-tax-${tax.name.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Delete tax config '${tax.name}'?`))
                                  deleteTaxMut.mutate(tax.id);
                              }}
                              data-testid={`delete-tax-${tax.name.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              <Trash2 size={16} className="text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loyalty (Beats) Tab */}
      {activeTab === "loyalty" && (
        <Card>
          <CardHeader>
            <CardTitle>Loyalty (Beats) Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {LOYALTY_KEYS.map((lk) => (
                <div key={lk.key}>
                  <Label htmlFor={lk.key} className="text-xs">
                    {lk.label}
                  </Label>
                  {lk.type === "boolean" ? (
                    <select
                      id={lk.key}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={values[lk.key] || lk.default}
                      onChange={(e) => setValues({ ...values, [lk.key]: e.target.value })}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <Input
                      id={lk.key}
                      value={values[lk.key] || ""}
                      onChange={(e) => setValues({ ...values, [lk.key]: e.target.value })}
                      type={lk.type === "number" ? "number" : "text"}
                      data-testid={`loyalty-input-${lk.key}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Tab */}
      {activeTab === "webhook" && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-lg space-y-4">
              <div>
                <Label htmlFor="n8n_webhook_url">n8n Webhook URL</Label>
                <Input
                  id="n8n_webhook_url"
                  value={values["n8n_webhook_url"] || ""}
                  onChange={(e) => setValues({ ...values, n8n_webhook_url: e.target.value })}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Events like reservations, payments, and orders will be sent to this URL.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (!values["n8n_webhook_url"]) {
                    toast.error("Set a URL first");
                    return;
                  }
                  post("/webhook_logs/test", { url: values["n8n_webhook_url"] })
                    .then(() => toast.success("Test webhook sent!"))
                    .catch(() => toast.error("Test failed"));
                }}
                data-testid="n8n-webhook-test-button"
              >
                Send Test Payload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Public Website Tab */}
      {activeTab === "public_website" && (
        <Card>
          <CardHeader>
            <CardTitle>Public Website Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              {settings
                .filter((s: Setting) => s.category === "public_website")
                .map((s: Setting) => (
                  <div key={s.key} className="space-y-2">
                    <Label htmlFor={s.key} className="text-sm font-medium">
                      {s.description ||
                        s.key
                          .split("_")
                          .join(" ")
                          .replace(/^\w/, (c) => c.toUpperCase())}
                    </Label>
                    {s.key.includes("_url") || s.key.includes("_image") ? (
                      <div className="space-y-2">
                        <Input
                          id={s.key}
                          value={values[s.key] || ""}
                          onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                          placeholder="https://..."
                        />
                        {(values[s.key] || "").startsWith("http") && (
                          <div className="h-32 w-full rounded-xl overflow-hidden border border-input shadow-inner">
                            <img
                              src={values[s.key]}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ) : s.key.includes("_config") ? (
                      <div className="space-y-2">
                        <textarea
                          className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={values[s.key] || ""}
                          onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                          placeholder='[{"title": "...", "desc": "...", "img": "..."}]'
                        />
                        <p className="text-[10px] text-muted-foreground">
                          JSON format: Array of objects with title, desc, img keys
                        </p>
                      </div>
                    ) : (
                      <Input
                        id={s.key}
                        value={values[s.key] || ""}
                        onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Plugin Tabs */}
      {pluginTabs.some((pt) => pt.id === activeTab) && (
        <PluginSlot name={Slots.ADMIN_SETTINGS_TABS} props={{ activeTab }} />
      )}
    </div>
  );
}
