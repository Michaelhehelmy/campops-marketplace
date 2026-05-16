/**
 * PluginCrudPage
 * ──────────────
 * Generic admin CRUD page for plugin-defined tables.
 * Automatically connects to GET/POST/PUT/DELETE /api/admin/tables/:pluginName/:tableSuffix.
 *
 * Props come from the adminPages entry in plugin.json:
 *   { pluginName, tableSuffix, columns, canCreate, canEdit, canDelete, title }
 */

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PluginCrudPageProps {
  /** The plugin name as in plugin.json (e.g. "test-dock") */
  pluginName: string;
  /** The table suffix (e.g. "dummy" → table = plugin_test_dock_dummy) */
  tableSuffix: string;
  /** Columns to display and edit */
  columns: string[];
  /** Page title shown as the H1 */
  title?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface PaginatedResponse {
  data: Record<string, any>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALWAYS_HIDDEN = new Set(["id", "property_id", "updated_at"]);

function formatCellValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleString();
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function humanize(col: string): string {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Row Form ─────────────────────────────────────────────────────────────────

function RowForm({
  columns,
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  columns: string[];
  initial: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<Record<string, any>>(initial);
  const editableCols = columns.filter((c) => !ALWAYS_HIDDEN.has(c));

  return (
    <div className="space-y-4">
      {editableCols.map((col) => (
        <div key={col} className="space-y-1.5">
          <label className="text-sm font-medium text-charcoal">{humanize(col)}</label>
          <Input
            value={form[col] ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
            placeholder={humanize(col)}
          />
        </div>
      ))}
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(form)} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PluginCrudPage({
  pluginName,
  tableSuffix,
  columns,
  title,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: PluginCrudPageProps) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const baseUrl = `/admin/tables/${pluginName}/${tableSuffix}`;
  const qKey = ["plugin-crud", pluginName, tableSuffix, page];

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: qKey,
    queryFn: () => api.get(`${baseUrl}?page=${page}&limit=25`).then((r) => r.data),
  });

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ["plugin-crud", pluginName, tableSuffix] }),
    [qc, pluginName, tableSuffix]
  );

  const createMutation = useMutation({
    mutationFn: (body: Record<string, any>) => api.post(baseUrl, body),
    onSuccess: () => {
      toast.success("Row created");
      setModalMode(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, any> }) =>
      api.put(`${baseUrl}/${id}`, body),
    onSuccess: () => {
      toast.success("Row updated");
      setModalMode(null);
      setEditRow(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${baseUrl}/${id}`),
    onSuccess: () => {
      toast.success("Row deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? "Failed to delete"),
  });

  const visibleCols = columns.filter((c) => !ALWAYS_HIDDEN.has(c));
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            {title ?? humanize(tableSuffix)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Plugin table:{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              plugin_{pluginName.replace(/-/g, "_")}_{tableSuffix}
            </code>
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditRow(null);
              setModalMode("create");
            }}
            className="gap-2"
          >
            <Plus size={16} /> New
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm font-medium">No records yet</p>
            {canCreate && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => {
                  setEditRow(null);
                  setModalMode("create");
                }}
              >
                <Plus size={14} /> Add first record
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {visibleCols.map((col) => (
                  <TableHead key={col}>{humanize(col)}</TableHead>
                ))}
                {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {visibleCols.map((col) => (
                    <TableCell key={col}>
                      {col === "status" ? (
                        <Badge variant="secondary">{formatCellValue(row[col])}</Badge>
                      ) : (
                        <span className="text-sm">{formatCellValue(row[col])}</span>
                      )}
                    </TableCell>
                  ))}
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right space-x-2">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditRow(row);
                            setModalMode("edit");
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(row.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * 25 + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalMode !== null} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modalMode === "create" ? "New Record" : "Edit Record"}</DialogTitle>
            <DialogDescription>
              {modalMode === "create"
                ? `Add a new row to ${tableSuffix}`
                : `Update fields for this row`}
            </DialogDescription>
          </DialogHeader>
          <RowForm
            columns={[...visibleCols]}
            initial={editRow ?? {}}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onCancel={() => {
              setModalMode(null);
              setEditRow(null);
            }}
            onSubmit={(formData) => {
              if (modalMode === "create") {
                createMutation.mutate(formData);
              } else if (editRow?.id) {
                updateMutation.mutate({ id: editRow.id, body: formData });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete record?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
