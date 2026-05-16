import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Activity, ActivitySchedule } from "@/types/api";
import { CalendarDays, Plus, Pencil, Trash2, Clock, Users, X } from "lucide-react";
import toast from "react-hot-toast";

interface ActivityForm {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  max_capacity: number;
  base_price: number;
  is_active: boolean;
}

const emptyForm: ActivityForm = {
  name: "",
  description: "",
  category: "",
  duration_minutes: 60,
  max_capacity: 10,
  base_price: 0,
  is_active: true,
};

export default function ActivitiesAdminPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [scheduleActivityId, setScheduleActivityId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.activities,
    queryFn: () => get<PaginatedResponse<Activity>>("/activities"),
  });

  const { data: schedules } = useQuery({
    queryKey: queryKeys.activitySchedules(scheduleActivityId ?? undefined),
    queryFn: () => get<ActivitySchedule[]>(`/activity_schedules?activity_id=${scheduleActivityId}`),
    enabled: !!scheduleActivityId,
  });

  const createMut = useMutation({
    mutationFn: (d: ActivityForm) => post("/activities", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activities });
      toast.success("Activity created");
      resetForm();
    },
    onError: () => toast.error("Failed to create activity"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: ActivityForm }) =>
      put(`/activities/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activities });
      toast.success("Activity updated");
      resetForm();
    },
    onError: () => toast.error("Failed to update activity"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del(`/activities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activities });
      toast.success("Activity deleted");
    },
  });

  const createScheduleMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => post("/activity_schedules", d),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.activitySchedules(scheduleActivityId ?? undefined),
      });
      toast.success("Schedule added");
    },
    onError: () => toast.error("Failed to add schedule"),
  });

  const deleteScheduleMut = useMutation({
    mutationFn: (id: string) => del(`/activity_schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.activitySchedules(scheduleActivityId ?? undefined),
      });
      toast.success("Schedule deleted");
    },
  });

  function resetForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  }

  function startEdit(a: Activity) {
    setEditId(a.id);
    setForm({
      name: a.name,
      description: a.description || "",
      category: a.category || "",
      duration_minutes: a.duration_minutes || 60,
      max_capacity: a.max_capacity || 10,
      base_price: a.base_price || 0,
      is_active: a.is_active,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, data: form });
    else createMut.mutate(form);
  }

  function handleScheduleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createScheduleMut.mutate({
      activity_id: scheduleActivityId,
      start_time: fd.get("start_time"),
      end_time: fd.get("end_time") || undefined,
      max_guests: Number(fd.get("max_guests")) || 10,
      notes: fd.get("notes") || undefined,
      is_active: true,
    });
    e.currentTarget.reset();
  }

  const activities = (data as any)?.data ?? [];

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6" data-testid="activities-heading">
          Activities Manager
        </h1>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="activities-heading">
          Activities Manager
        </h1>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          data-testid="add-activity-btn"
        >
          <Plus size={18} className="mr-2" /> Add Activity
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editId ? "Edit Activity" : "New Activity"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. safari, water, adventure"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>Max Capacity</Label>
                <Input
                  type="number"
                  value={form.max_capacity}
                  onChange={(e) => setForm({ ...form, max_capacity: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
                  min={0}
                  step="0.01"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Activity List */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activities created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <Card key={a.id} data-testid="activity-card">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{a.name}</h3>
                      <Badge
                        variant={a.is_active ? "success" : "secondary"}
                        data-testid="activity-status-badge"
                      >
                        {a.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {a.description && (
                      <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {a.duration_minutes}min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} /> Max {a.max_capacity}
                      </span>
                      <span>${Number(a.base_price ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setScheduleActivityId(scheduleActivityId === a.id ? null : a.id)
                      }
                    >
                      <CalendarDays size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(a)}>
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this activity?")) deleteMut.mutate(a.id);
                      }}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Schedules panel */}
                {scheduleActivityId === a.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Schedules</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setScheduleActivityId(null)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                    {schedules && schedules.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {schedules.map((s) => (
                          <div
                            key={s.id}
                            className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded"
                          >
                            <div>
                              <span className="font-medium">
                                {new Date(s.start_time).toLocaleString()}
                              </span>
                              {s.end_time && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  – {new Date(s.end_time).toLocaleString()}
                                </span>
                              )}
                              {s.max_guests && (
                                <span className="ml-3 text-muted-foreground">
                                  ({s.available_spots ?? s.max_guests}/{s.max_guests} spots)
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete schedule?")) deleteScheduleMut.mutate(s.id);
                              }}
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-4">No schedules yet.</p>
                    )}
                    <form onSubmit={handleScheduleSubmit} className="grid sm:grid-cols-4 gap-3">
                      <div>
                        <Label>Start Time</Label>
                        <Input name="start_time" type="datetime-local" required />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input name="end_time" type="datetime-local" />
                      </div>
                      <div>
                        <Label>Max Guests</Label>
                        <Input name="max_guests" type="number" defaultValue={10} min={1} />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" disabled={createScheduleMut.isPending}>
                          Add Schedule
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
