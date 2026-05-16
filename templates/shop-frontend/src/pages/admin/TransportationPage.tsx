/**
 * Transportation Management Page
 * Admin interface for managing vehicles, drivers, and transfers
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useVehicles,
  useDrivers,
  useTransfers,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useCreateTransfer,
  useUpdateTransfer,
  useUpdateTransferStatus,
  useDeleteTransfer,
} from "@/hooks/queries/useTransport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Car,
  Users,
  Route,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { Vehicle, Driver, Transfer } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

// ============================================
// VEHICLE FORM COMPONENT
// ============================================
function VehicleForm({
  vehicle,
  onSubmit,
  onCancel,
}: {
  vehicle?: Vehicle;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    make: vehicle?.make || "",
    model: vehicle?.model || "",
    license_plate: vehicle?.license_plate || "",
    type: vehicle?.type || "4x4",
    capacity: vehicle?.capacity || 8,
    status: vehicle?.status || "available",
    last_maintenance: vehicle?.last_maintenance || "",
    notes: vehicle?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <Input
            id="make"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            required
            data-testid="vehicle-make-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            required
            data-testid="vehicle-model-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="license_plate">License Plate</Label>
        <Input
          id="license_plate"
          value={formData.license_plate}
          onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
          required
          data-testid="vehicle-plate-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as "other" | "4x4" | "sedan" | "van" | "bus",
              })
            }
            options={[
              { value: "4x4", label: "4x4" },
              { value: "sedan", label: "Sedan" },
              { value: "van", label: "Van" },
              { value: "bus", label: "Bus" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as "available" | "maintenance" | "in_use" | "retired",
            })
          }
          options={[
            { value: "available", label: "Available" },
            { value: "in_use", label: "In Use" },
            { value: "maintenance", label: "Maintenance" },
            { value: "retired", label: "Retired" },
          ]}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="last_maintenance">Last Maintenance</Label>
        <Input
          id="last_maintenance"
          type="date"
          value={formData.last_maintenance}
          onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" data-testid="save-vehicle-btn">
          {vehicle ? "Update" : "Create"} Vehicle
        </Button>
      </div>
    </form>
  );
}

// ============================================
// DRIVER FORM COMPONENT
// ============================================
function DriverForm({
  driver,
  onSubmit,
  onCancel,
}: {
  driver?: Driver;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    full_name: driver?.full_name || "",
    license_number: driver?.license_number || "",
    license_expiry: driver?.license_expiry || "",
    phone: driver?.phone || "",
    status: driver?.status || "active",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input
          id="full_name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          required
          data-testid="driver-name-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="license_number">License Number</Label>
        <Input
          id="license_number"
          value={formData.license_number}
          onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="license_expiry">License Expiry</Label>
        <Input
          id="license_expiry"
          type="date"
          value={formData.license_expiry}
          onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as "active" | "inactive" | "suspended",
            })
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" data-testid="save-driver-btn">
          {driver ? "Update" : "Create"} Driver
        </Button>
      </div>
    </form>
  );
}

// ============================================
// TRANSFER FORM COMPONENT
// ============================================
function TransferForm({
  transfer,
  vehicles,
  drivers,
  onSubmit,
  onCancel,
}: {
  transfer?: Transfer;
  vehicles: Vehicle[];
  drivers: Driver[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    guest_name: transfer?.guest_name || "",
    guest_count: transfer?.guest_count || 1,
    vehicle_id: transfer?.vehicle_id || "",
    driver_id: transfer?.driver_id || "",
    transfer_type: transfer?.transfer_type || "pickup",
    pickup_location: transfer?.pickup_location || "",
    dropoff_location: transfer?.dropoff_location || "",
    pickup_datetime: transfer?.pickup_datetime
      ? format(new Date(transfer.pickup_datetime), "yyyy-MM-dd'T'HH:mm")
      : "",
    price: transfer?.price || 0,
    notes: transfer?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      pickup_datetime: new Date(formData.pickup_datetime).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="guest_name">Guest Name</Label>
        <Input
          id="guest_name"
          value={formData.guest_name}
          onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
          required
          data-testid="transfer-guest-name-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guest_count">Guest Count</Label>
          <Input
            id="guest_count"
            type="number"
            min={1}
            value={formData.guest_count}
            onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
            required
            data-testid="transfer-guest-count-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            required
            data-testid="transfer-price-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehicle</Label>
          <Select
            value={formData.vehicle_id}
            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
            placeholder="Select vehicle"
            options={
              vehicles?.map((v) => ({
                value: v.id,
                label: `${v.make} ${v.model} (${v.license_plate})`,
              })) || []
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driver">Driver</Label>
          <Select
            value={formData.driver_id}
            onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
            placeholder="Select driver"
            options={
              drivers?.map((d) => ({
                value: d.id,
                label: d.full_name || d.license_number,
              })) || []
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="transfer_type">Transfer Type</Label>
        <Select
          value={formData.transfer_type}
          onChange={(e) =>
            setFormData({
              ...formData,
              transfer_type: e.target.value as "pickup" | "dropoff" | "roundtrip" | "excursion",
            })
          }
          options={[
            { value: "pickup", label: "Pickup" },
            { value: "dropoff", label: "Dropoff" },
            { value: "roundtrip", label: "Round Trip" },
            { value: "excursion", label: "Excursion" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pickup_location">Pickup Location</Label>
          <Input
            id="pickup_location"
            value={formData.pickup_location}
            onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dropoff_location">Dropoff Location</Label>
          <Input
            id="dropoff_location"
            value={formData.dropoff_location}
            onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pickup_datetime">Pickup Date/Time</Label>
        <Input
          id="pickup_datetime"
          type="datetime-local"
          value={formData.pickup_datetime}
          onChange={(e) => setFormData({ ...formData, pickup_datetime: e.target.value })}
          required
          data-testid="transfer-pickup-datetime-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" data-testid="save-transfer-btn">
          {transfer ? "Update" : "Schedule"} Transfer
        </Button>
      </div>
    </form>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function TransportationPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("transport.edit");
  const canDelete = hasPermission("transport.delete");

  // Data fetching
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: transfersData, isLoading: transfersLoading } = useTransfers({
    limit: 50,
  });
  const transfers = transfersData?.data || [];

  // Mutations
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const updateTransferStatus = useUpdateTransferStatus();
  const deleteTransfer = useDeleteTransfer();

  // Dialog states
  const [vehicleDialog, setVehicleDialog] = useState<{ open: boolean; vehicle?: Vehicle }>({
    open: false,
  });
  const [driverDialog, setDriverDialog] = useState<{ open: boolean; driver?: Driver }>({
    open: false,
  });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; transfer?: Transfer }>({
    open: false,
  });

  // Vehicle handlers
  const handleVehicleSubmit = async (data: any) => {
    try {
      if (vehicleDialog.vehicle) {
        await updateVehicle.mutateAsync({ id: vehicleDialog.vehicle.id, data });
        toast({ title: "Vehicle updated successfully" });
      } else {
        await createVehicle.mutateAsync(data);
        toast({ title: "Vehicle created successfully" });
      }
      setVehicleDialog({ open: false });
    } catch (error) {
      toast({ title: "Error saving vehicle", variant: "destructive" });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await deleteVehicle.mutateAsync(id);
      toast({ title: "Vehicle deleted successfully" });
    } catch (error) {
      toast({ title: "Error deleting vehicle", variant: "destructive" });
    }
  };

  // Driver handlers
  const handleDriverSubmit = async (data: any) => {
    try {
      if (driverDialog.driver) {
        await updateDriver.mutateAsync({ id: driverDialog.driver.id, data });
        toast({ title: "Driver updated successfully" });
      } else {
        await createDriver.mutateAsync(data);
        toast({ title: "Driver created successfully" });
      }
      setDriverDialog({ open: false });
    } catch (error: any) {
      toast({
        title: "Error saving driver",
        description: error?.response?.data?.error || error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDriver.mutateAsync(id);
      toast({ title: "Driver deleted successfully" });
    } catch (error) {
      toast({ title: "Error deleting driver", variant: "destructive" });
    }
  };

  // Transfer handlers
  const handleTransferSubmit = async (data: any) => {
    try {
      if (transferDialog.transfer) {
        await updateTransfer.mutateAsync({ id: transferDialog.transfer.id, data });
        toast({ title: "Transfer updated successfully" });
      } else {
        await createTransfer.mutateAsync(data);
        toast({ title: "Transfer scheduled successfully" });
      }
      setTransferDialog({ open: false });
    } catch (error) {
      toast({ title: "Error saving transfer", variant: "destructive" });
    }
  };

  const handleUpdateTransferStatus = async (id: string, status: Transfer["status"]) => {
    try {
      await updateTransferStatus.mutateAsync({
        id,
        status,
        dropoff_datetime: status === "completed" ? new Date().toISOString() : undefined,
      });
      toast({ title: `Transfer marked as ${status}` });
    } catch (error) {
      toast({ title: "Error updating transfer status", variant: "destructive" });
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transfer?")) return;
    try {
      await deleteTransfer.mutateAsync(id);
      toast({ title: "Transfer deleted successfully" });
    } catch (error) {
      toast({ title: "Error deleting transfer", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      active: "default",
      scheduled: "default",
      in_use: "secondary",
      in_progress: "secondary",
      maintenance: "destructive",
      completed: "default",
      cancelled: "outline",
      retired: "outline",
      inactive: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="transport-heading">
          Transportation Management
        </h1>
        <p className="text-muted-foreground">Manage vehicles, drivers, and guest transfers</p>
      </div>

      <Tabs defaultValue="vehicles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger
            value="vehicles"
            className="flex items-center gap-2"
            data-testid="tab-vehicles"
          >
            <Car className="h-4 w-4" />
            <span>Vehicles</span>
          </TabsTrigger>
          <TabsTrigger
            value="drivers"
            className="flex items-center gap-2"
            data-testid="tab-drivers"
          >
            <Users className="h-4 w-4" />
            <span>Drivers</span>
          </TabsTrigger>
          <TabsTrigger
            value="transfers"
            className="flex items-center gap-2"
            data-testid="tab-transfers"
          >
            <Route className="h-4 w-4" />
            <span>Transfers</span>
          </TabsTrigger>
        </TabsList>

        {/* VEHICLES TAB */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Fleet Management
              </CardTitle>
              {canEdit && (
                <Dialog
                  open={vehicleDialog.open && !vehicleDialog.vehicle}
                  onOpenChange={(open: boolean) => setVehicleDialog({ open })}
                >
                  <DialogTrigger asChild>
                    <Button data-testid="add-vehicle-btn">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Vehicle</DialogTitle>
                    </DialogHeader>
                    <VehicleForm
                      onSubmit={handleVehicleSubmit}
                      onCancel={() => setVehicleDialog({ open: false })}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {vehiclesLoading ? (
                <div className="text-center py-8">Loading vehicles...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>License Plate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Maintenance</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          {vehicle.make} {vehicle.model}
                        </TableCell>
                        <TableCell>{vehicle.license_plate}</TableCell>
                        <TableCell className="capitalize">{vehicle.type}</TableCell>
                        <TableCell>{vehicle.capacity} seats</TableCell>
                        <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                        <TableCell>
                          {vehicle.last_maintenance
                            ? format(new Date(vehicle.last_maintenance), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`edit-vehicle-${vehicle.id}`}
                                onClick={() => setVehicleDialog({ open: true, vehicle })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`delete-vehicle-${vehicle.id}`}
                                  onClick={() => handleDeleteVehicle(vehicle.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Vehicle Dialog */}
          <Dialog
            open={vehicleDialog.open && !!vehicleDialog.vehicle}
            onOpenChange={(open: boolean) => !open && setVehicleDialog({ open: false })}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Vehicle</DialogTitle>
              </DialogHeader>
              {vehicleDialog.vehicle && (
                <VehicleForm
                  vehicle={vehicleDialog.vehicle}
                  onSubmit={handleVehicleSubmit}
                  onCancel={() => setVehicleDialog({ open: false })}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* DRIVERS TAB */}
        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Driver Management
              </CardTitle>
              {canEdit && (
                <Dialog
                  open={driverDialog.open && !driverDialog.driver}
                  onOpenChange={(open: boolean) => setDriverDialog({ open })}
                >
                  <DialogTrigger asChild>
                    <Button data-testid="add-driver-btn">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Driver
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Driver</DialogTitle>
                    </DialogHeader>
                    <DriverForm
                      onSubmit={handleDriverSubmit}
                      onCancel={() => setDriverDialog({ open: false })}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {driversLoading ? (
                <div className="text-center py-8">Loading drivers...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>License Expiry</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.full_name || "-"}</TableCell>
                        <TableCell>{driver.license_number}</TableCell>
                        <TableCell>
                          {format(new Date(driver.license_expiry), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(driver.status)}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`edit-driver-${driver.id}`}
                                onClick={() => setDriverDialog({ open: true, driver })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`delete-driver-${driver.id}`}
                                  onClick={() => handleDeleteDriver(driver.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Driver Dialog */}
          <Dialog
            open={driverDialog.open && !!driverDialog.driver}
            onOpenChange={(open: boolean) => !open && setDriverDialog({ open: false })}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Driver</DialogTitle>
              </DialogHeader>
              {driverDialog.driver && (
                <DriverForm
                  driver={driverDialog.driver}
                  onSubmit={handleDriverSubmit}
                  onCancel={() => setDriverDialog({ open: false })}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Transfer Schedule
              </CardTitle>
              {canEdit && (
                <Dialog
                  open={transferDialog.open && !transferDialog.transfer}
                  onOpenChange={(open: boolean) => setTransferDialog({ open })}
                >
                  <DialogTrigger asChild>
                    <Button data-testid="schedule-transfer-btn">
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Transfer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Schedule New Transfer</DialogTitle>
                    </DialogHeader>
                    <TransferForm
                      vehicles={vehicles}
                      drivers={drivers}
                      onSubmit={handleTransferSubmit}
                      onCancel={() => setTransferDialog({ open: false })}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {transfersLoading ? (
                <div className="text-center py-8">Loading transfers...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">
                          <div>{transfer.guest_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {transfer.guest_count} guests
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {transfer.pickup_location}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            → {transfer.dropoff_location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(transfer.pickup_datetime), "MMM d, HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transfer.vehicle_make ? (
                            <div>
                              {transfer.vehicle_make} {transfer.vehicle_model}
                              <div className="text-xs text-muted-foreground">
                                {transfer.license_plate}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{transfer.driver_name || "-"}</TableCell>
                        <TableCell>{formatCurrency(transfer.price)}</TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {transfer.status === "scheduled" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateTransferStatus(transfer.id, "in_progress")
                                  }
                                  title="Start Transfer"
                                  data-testid={`start-transfer-${transfer.id}`}
                                >
                                  <Clock className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              {transfer.status === "in_progress" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateTransferStatus(transfer.id, "completed")
                                  }
                                  title="Complete Transfer"
                                  data-testid={`complete-transfer-${transfer.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              {(transfer.status === "scheduled" ||
                                transfer.status === "in_progress") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateTransferStatus(transfer.id, "cancelled")
                                  }
                                  title="Cancel Transfer"
                                  data-testid={`cancel-transfer-${transfer.id}`}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`edit-transfer-${transfer.id}`}
                                onClick={() => setTransferDialog({ open: true, transfer })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`delete-transfer-${transfer.id}`}
                                  onClick={() => handleDeleteTransfer(transfer.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Transfer Dialog */}
          <Dialog
            open={transferDialog.open && !!transferDialog.transfer}
            onOpenChange={(open: boolean) => !open && setTransferDialog({ open: false })}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Transfer</DialogTitle>
              </DialogHeader>
              {transferDialog.transfer && (
                <TransferForm
                  transfer={transferDialog.transfer}
                  vehicles={vehicles}
                  drivers={drivers}
                  onSubmit={handleTransferSubmit}
                  onCancel={() => setTransferDialog({ open: false })}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
