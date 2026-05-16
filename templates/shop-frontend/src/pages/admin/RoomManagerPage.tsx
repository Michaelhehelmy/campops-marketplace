import { useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  BedDouble,
  Plus,
  Trash2,
  CalendarRange,
  Copy,
  Pencil,
  X,
  Upload,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSocketEvent } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useAdminRooms,
  useAdminRoom,
  useCreateRoom,
  useUpdateRoom,
  useDeactivateRoom,
  useUploadRoomImage,
  useAddRoomImage,
  useDeleteRoomImage,
  useReorderRoomImages,
  useAddSeasonalPrice,
  useDeleteSeasonalPrice,
  type AdminRoom,
} from "@/hooks/queries/useAdminRooms";

// ─── Predefined amenity options ────────────────────────────────────────────────
const AMENITY_OPTIONS = [
  "Ocean View",
  "Mountain View",
  "Private Pool",
  "Jacuzzi",
  "Mini Bar",
  "WiFi",
  "Air Conditioning",
  "Heating",
  "Flat Screen TV",
  "Kitchenette",
  "Balcony",
  "Terrace",
  "Safe",
  "Hair Dryer",
  "Iron",
  "Coffee Machine",
  "Bathrobe",
  "Slippers",
  "Daily Housekeeping",
  "24h Room Service",
];

const ROOM_TYPES = [
  "cabin",
  "deluxe",
  "suite",
  "standard",
  "villa",
  "glamping",
  "treehouse",
  "tent",
];
const BED_TYPES = ["king", "queen", "twin", "double", "bunk", "sofa bed", "single"];
const VIEW_TYPES = ["ocean", "mountain", "garden", "pool", "city", "forest", "desert", "none"];

// ─── Room Form Modal ────────────────────────────────────────────────────────────
function RoomFormModal({ room, onClose }: { room?: AdminRoom; onClose: () => void }) {
  const isEdit = !!room;
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom(room?.id ?? "");
  const uploadImg = useUploadRoomImage(room?.id ?? "");
  const addImgUrl = useAddRoomImage(room?.id ?? "");
  const deleteImg = useDeleteRoomImage(room?.id ?? "");
  const reorderImgs = useReorderRoomImages(room?.id ?? "");
  const addSeasonal = useAddSeasonalPrice(room?.id ?? "");
  const delSeasonal = useDeleteSeasonalPrice(room?.id ?? "");

  const { data: roomDetailRes } = useAdminRoom(room?.id ?? "");
  const detail: AdminRoom | undefined = roomDetailRes?.data ?? room;

  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"basic" | "amenities" | "images" | "pricing" | "seasonal">(
    "basic"
  );
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [imgUrlInput, setImgUrlInput] = useState("");
  const [seasonForm, setSeasonForm] = useState({
    label: "",
    start_date: "",
    end_date: "",
    price_override: "",
    price_multiplier: "",
  });

  async function handleBasicSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      type: fd.get("type") as string,
      description: (fd.get("description") as string) || undefined,
      base_price: Number(fd.get("base_price")),
      capacity: Number(fd.get("capacity")),
      max_occupancy: fd.get("max_occupancy") ? Number(fd.get("max_occupancy")) : undefined,
      size_sqm: fd.get("size_sqm") ? Number(fd.get("size_sqm")) : undefined,
      bed_type: (fd.get("bed_type") as string) || undefined,
      view_type: (fd.get("view_type") as string) || undefined,
      floor: (fd.get("floor") as string) || undefined,
      status: fd.get("status") as string,
      notes: (fd.get("notes") as string) || undefined,
      amenities,
    };
    try {
      if (isEdit) {
        await updateRoom.mutateAsync(payload);
        toast.success("Room updated");
      } else {
        await createRoom.mutateAsync(payload);
        toast.success("Room created");
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to save room");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!room?.id) {
      toast.error("Save basic info first");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadImg.mutateAsync({ file, is_primary: (detail?.images?.length ?? 0) === 0 });
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleAddImgUrl() {
    if (!imgUrlInput.trim()) return;
    if (!room?.id) {
      toast.error("Save basic info first");
      return;
    }
    try {
      await addImgUrl.mutateAsync({
        url: imgUrlInput.trim(),
        is_primary: (detail?.images?.length ?? 0) === 0,
      });
      setImgUrlInput("");
      toast.success("Image added");
    } catch {
      toast.error("Failed to add image");
    }
  }

  async function handleSetPrimary(imgId: string) {
    if (!detail) return;
    const order = (detail.images ?? []).map((img) => ({
      id: img.id,
      sort_order: img.sort_order,
      is_primary: img.id === imgId,
    }));
    await reorderImgs.mutateAsync(order);
    toast.success("Primary image set");
  }

  async function handleAddSeasonal(e: React.FormEvent) {
    e.preventDefault();
    if (!room?.id) {
      toast.error("Save room first");
      return;
    }
    try {
      await addSeasonal.mutateAsync({
        label: seasonForm.label || undefined,
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date,
        price_override: seasonForm.price_override ? Number(seasonForm.price_override) : undefined,
        price_multiplier: seasonForm.price_multiplier
          ? Number(seasonForm.price_multiplier)
          : undefined,
      });
      setSeasonForm({
        label: "",
        start_date: "",
        end_date: "",
        price_override: "",
        price_multiplier: "",
      });
      toast.success("Seasonal price added");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed");
    }
  }

  const tabs = [
    { id: "basic", label: "Basic Info" },
    { id: "amenities", label: "Amenities" },
    { id: "images", label: `Images${detail?.images?.length ? ` (${detail.images.length})` : ""}` },
    { id: "pricing", label: "Pricing" },
    {
      id: "seasonal",
      label: `Seasonal${detail?.seasonal_pricing?.length ? ` (${detail.seasonal_pricing.length})` : ""}`,
    },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold" data-testid="room-modal-title">
            {isEdit ? `Edit Room – ${room.name}` : "Add New Room"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* ── BASIC INFO ── */}
          {tab === "basic" && (
            <form onSubmit={handleBasicSubmit} className="space-y-4" data-testid="room-basic-form">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Room Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={room?.name}
                    required
                    data-testid="room-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="room-type">Type</Label>
                  <select
                    id="room-type"
                    name="type"
                    defaultValue={room?.type ?? "cabin"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="base_price">Base Price (per night) *</Label>
                  <Input
                    id="base_price"
                    name="base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={room?.base_price ?? 0}
                    required
                    data-testid="room-base-price"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={room?.status ?? "available"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {["available", "occupied", "dirty", "maintenance", "inactive"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity (guests)</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    defaultValue={room?.capacity ?? 2}
                    data-testid="room-capacity"
                  />
                </div>
                <div>
                  <Label htmlFor="max_occupancy">Max Occupancy</Label>
                  <Input
                    id="max_occupancy"
                    name="max_occupancy"
                    type="number"
                    min="1"
                    defaultValue={room?.max_occupancy ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="size_sqm">Size (sqm)</Label>
                  <Input
                    id="size_sqm"
                    name="size_sqm"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={room?.size_sqm ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    name="floor"
                    defaultValue={room?.floor ?? ""}
                    placeholder="e.g. 2"
                  />
                </div>
                <div>
                  <Label htmlFor="bed_type">Bed Type</Label>
                  <select
                    id="bed_type"
                    name="bed_type"
                    defaultValue={room?.bed_type ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {BED_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="view_type">View Type</Label>
                  <select
                    id="view_type"
                    name="view_type"
                    defaultValue={room?.view_type ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {VIEW_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  name="description"
                  defaultValue={room?.description ?? ""}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Describe the room…"
                />
              </div>
              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <textarea
                  name="notes"
                  defaultValue={room?.notes ?? ""}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
              <Button
                type="submit"
                data-testid="save-room-btn"
                disabled={createRoom.isPending || updateRoom.isPending}
              >
                {isEdit ? "Save Changes" : "Create Room"}
              </Button>
            </form>
          )}

          {/* ── AMENITIES ── */}
          {tab === "amenities" && (
            <div data-testid="room-amenities-tab">
              <p className="text-sm text-muted-foreground mb-4">
                Select all amenities this room provides.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={amenities.includes(a)}
                      data-testid={`amenities-checkbox-${a.toLowerCase().replace(/\s+/g, "-")}`}
                      onChange={(e) =>
                        setAmenities(
                          e.target.checked ? [...amenities, a] : amenities.filter((x) => x !== a)
                        )
                      }
                    />
                    <span className="text-sm">{a}</span>
                  </label>
                ))}
              </div>
              {room?.id && (
                <Button
                  className="mt-4"
                  onClick={async () => {
                    try {
                      await updateRoom.mutateAsync({ amenities });
                      toast.success("Amenities saved");
                    } catch {
                      toast.error("Failed to save amenities");
                    }
                  }}
                  disabled={updateRoom.isPending}
                >
                  Save Amenities
                </Button>
              )}
              {!room?.id && (
                <p className="text-xs text-muted-foreground mt-3">
                  Amenities will be saved when you create the room from the Basic Info tab.
                </p>
              )}
            </div>
          )}

          {/* ── IMAGES ── */}
          {tab === "images" && (
            <div data-testid="room-images-tab" className="space-y-4">
              {!room?.id && (
                <p className="text-sm text-muted-foreground">
                  Save the room first to manage images.
                </p>
              )}
              {room?.id && (
                <>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      data-testid="upload-image-btn"
                    >
                      <Upload size={14} className="mr-1" /> Upload File
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Input
                      placeholder="Or paste image URL…"
                      value={imgUrlInput}
                      onChange={(e) => setImgUrlInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddImgUrl} variant="outline">
                      Add URL
                    </Button>
                  </div>
                  {(detail?.images ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No images yet.</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(detail?.images ?? [])
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((img) => (
                        <div
                          key={img.id}
                          className="relative group rounded-lg overflow-hidden border aspect-video bg-muted"
                        >
                          <img
                            src={img.url}
                            alt={img.alt_text ?? ""}
                            className="w-full h-full object-cover"
                          />
                          {img.is_primary && (
                            <span className="absolute top-1 left-1 bg-yellow-400 text-black text-xs px-1 rounded font-medium">
                              Primary
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!img.is_primary && (
                              <button
                                onClick={() => handleSetPrimary(img.id)}
                                title="Set as primary"
                                aria-label="Set as primary"
                                className="bg-yellow-400 text-black rounded-full p-1"
                              >
                                <Star size={12} />
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await deleteImg.mutateAsync(img.id);
                                toast.success("Deleted");
                              }}
                              aria-label="Delete image"
                              className="bg-destructive text-white rounded-full p-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── PRICING ── */}
          {tab === "pricing" && (
            <div data-testid="room-pricing-tab" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Base price is set in Basic Info. Link a rate plan for dynamic pricing.
              </p>
              <div className="rounded-md border p-4 space-y-2">
                <p className="font-medium text-sm">Current Base Price</p>
                <p className="text-2xl font-bold">
                  ${(detail?.base_price ?? 0).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground"> / night</span>
                </p>
                {detail?.rate_plan_name && (
                  <p className="text-xs text-muted-foreground">
                    Rate plan: <span className="font-medium">{detail.rate_plan_name}</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                To update the base price, go to the <strong>Basic Info</strong> tab.
              </p>
            </div>
          )}

          {/* ── SEASONAL PRICING ── */}
          {tab === "seasonal" && (
            <div data-testid="room-seasonal-tab" className="space-y-4">
              {!room?.id && (
                <p className="text-sm text-muted-foreground">
                  Save the room first to manage seasonal pricing.
                </p>
              )}
              {room?.id && (
                <>
                  {(detail?.seasonal_pricing ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No seasonal prices set.</p>
                  )}
                  {(detail?.seasonal_pricing ?? []).map((sp) => (
                    <div
                      key={sp.id}
                      className="flex items-center gap-3 rounded-md border p-3"
                      data-testid="seasonal-price-row"
                    >
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{sp.label ?? "Season"}</span>
                        <span className="text-muted-foreground ml-2">
                          {sp.start_date} → {sp.end_date}
                        </span>
                        {sp.price_override && (
                          <span className="ml-2 font-semibold">${sp.price_override}/night</span>
                        )}
                        {sp.price_multiplier && (
                          <span className="ml-2 font-semibold">×{sp.price_multiplier}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove seasonal price"
                        onClick={async () => {
                          await delSeasonal.mutateAsync(sp.id);
                          toast.success("Removed");
                        }}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <form onSubmit={handleAddSeasonal} className="rounded-md border p-4 space-y-3">
                    <p className="font-medium text-sm">Add Seasonal Price</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Label (optional)</Label>
                        <Input
                          value={seasonForm.label}
                          onChange={(e) => setSeasonForm((s) => ({ ...s, label: e.target.value }))}
                          placeholder="e.g. Peak Season"
                        />
                      </div>
                      <div />
                      <div>
                        <Label htmlFor="season-start">Start Date *</Label>
                        <Input
                          id="season-start"
                          type="date"
                          value={seasonForm.start_date}
                          required
                          onChange={(e) =>
                            setSeasonForm((s) => ({ ...s, start_date: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="season-end">End Date *</Label>
                        <Input
                          id="season-end"
                          type="date"
                          value={seasonForm.end_date}
                          required
                          onChange={(e) =>
                            setSeasonForm((s) => ({ ...s, end_date: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Price Override ($/night)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={seasonForm.price_override}
                          onChange={(e) =>
                            setSeasonForm((s) => ({ ...s, price_override: e.target.value }))
                          }
                          placeholder="e.g. 250"
                        />
                      </div>
                      <div>
                        <Label>Multiplier (e.g. 1.5 = +50%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={seasonForm.price_multiplier}
                          onChange={(e) =>
                            setSeasonForm((s) => ({ ...s, price_multiplier: e.target.value }))
                          }
                          placeholder="e.g. 1.5"
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={addSeasonal.isPending}>
                      Add Season
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoomManagerPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState<AdminRoom | undefined>();
  const [showIcal, setShowIcal] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalRoomId, setIcalRoomId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [deactivateConfirmName, setDeactivateConfirmName] = useState("");

  const { data, isLoading } = useAdminRooms({
    status: filterStatus || undefined,
    search: filterSearch || undefined,
  });
  const deactivate = useDeactivateRoom();

  useSocketEvent("ROOM_CREATED", () => qc.invalidateQueries({ queryKey: queryKeys.adminRooms }));
  useSocketEvent("ROOM_UPDATED", () => qc.invalidateQueries({ queryKey: queryKeys.adminRooms }));
  useSocketEvent("ROOM_STATUS_UPDATED", () =>
    qc.invalidateQueries({ queryKey: queryKeys.adminRooms })
  );

  const importIcal = {
    mutate: (data: { room_id: string; ical_url: string }) =>
      post("/rooms/ical-import", data)
        .then(() => {
          toast.success("iCal imported");
          setIcalUrl("");
          setIcalRoomId("");
        })
        .catch(() => toast.error("Import failed")),
    isPending: false,
  };

  const rooms = data?.data ?? [];

  const apiBase = import.meta.env.VITE_API_URL || window.location.origin;

  const statusColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    available: "success",
    occupied: "secondary",
    dirty: "warning",
    maintenance: "destructive",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="rooms-heading">
          Rooms
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowIcal(!showIcal)}>
            <CalendarRange size={16} className="mr-1" /> iCal Sync
          </Button>
          <Button
            data-testid="add-room-btn"
            onClick={() => {
              setEditRoom(undefined);
              setShowModal(true);
            }}
          >
            <Plus size={16} className="mr-1" /> Add Room
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex flex-col">
          <Label htmlFor="room-search" className="sr-only">
            Search rooms
          </Label>
          <Input
            id="room-search"
            placeholder="Search rooms…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="max-w-xs"
            data-testid="room-search-input"
          />
        </div>
        <div className="flex flex-col">
          <Label htmlFor="status-filter" className="sr-only">
            Filter by status
          </Label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {["available", "occupied", "dirty", "maintenance", "inactive"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* iCal panel */}
      {showIcal && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">iCal Calendar Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Export – copy feed URL</h4>
              <div className="flex flex-wrap gap-2">
                {rooms.map((room) => (
                  <Button
                    key={room.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${apiBase}/api/rooms/${room.id}/ical`);
                      toast.success(`Copied for ${room.name}`);
                    }}
                  >
                    <Copy size={12} className="mr-1" /> {room.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Import – block from external calendar</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!icalRoomId || !icalUrl) {
                    toast.error("Select room and enter URL");
                    return;
                  }
                  importIcal.mutate({ room_id: icalRoomId, ical_url: icalUrl });
                }}
                className="grid sm:grid-cols-3 gap-3"
              >
                <div>
                  <Label htmlFor="ical-room">Room</Label>
                  <select
                    id="ical-room"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={icalRoomId}
                    onChange={(e) => setIcalRoomId(e.target.value)}
                  >
                    <option value="">Select room…</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ical-url">iCal URL</Label>
                  <Input
                    id="ical-url"
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Import</Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BedDouble className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No rooms yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="rooms-grid"
          data-testid-alias="rooms-list"
        >
          {rooms.map((room) => (
            <Card
              key={room.id}
              className={!room.is_active ? "opacity-50" : ""}
              data-testid={`room-card-${room.id}`}
            >
              {room.thumbnail_url && (
                <div className="aspect-video overflow-hidden rounded-t-xl">
                  <img
                    src={room.thumbnail_url}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold">{room.name}</h3>
                  <Badge variant={statusColors[room.status] ?? "secondary"}>{room.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {room.type} · {room.capacity} guests
                  {room.bed_type ? ` · ${room.bed_type}` : ""}
                </p>
                <p className="text-sm font-medium mt-1">
                  ${Number(room.base_price ?? 0).toFixed(2)}/night
                </p>
                {(room.amenities ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {(room.amenities as string[]).slice(0, 3).join(", ")}
                    {(room.amenities as string[]).length > 3 ? "…" : ""}
                  </p>
                )}
                <div className="flex justify-end gap-1 mt-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`edit-room-${room.id}`}
                    aria-label={`Edit ${room.name}`}
                    onClick={() => {
                      setEditRoom(room);
                      setShowModal(true);
                    }}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`deactivate-room-${room.id}`}
                    aria-label={`Deactivate ${room.name}`}
                    onClick={() => {
                      setDeactivateConfirmId(room.id);
                      setDeactivateConfirmName(room.name);
                    }}
                  >
                    <Trash2 size={15} className="text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deactivateConfirmId}
        onOpenChange={(open) => !open && setDeactivateConfirmId(null)}
        onConfirm={async () => {
          if (deactivateConfirmId) {
            await deactivate.mutateAsync(deactivateConfirmId);
            toast.success("Room deactivated");
          }
        }}
        title="Deactivate Room"
        description={`Are you sure you want to deactivate "${deactivateConfirmName}"?`}
      />

      {/* Modal */}
      {showModal && (
        <RoomFormModal
          room={editRoom}
          onClose={() => {
            setShowModal(false);
            setEditRoom(undefined);
          }}
        />
      )}
    </div>
  );
}
