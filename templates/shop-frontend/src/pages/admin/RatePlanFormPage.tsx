import { useParams, useNavigate } from "react-router-dom";
import { useRatePlan, useCreateRatePlan, useUpdateRatePlan } from "@/hooks/queries/useRatePlans";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/Textarea";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import toast from "react-hot-toast";
import type { RatePlan } from "@/types/api";

type RatePlanFormData = Omit<RatePlan, "id" | "created_at" | "updated_at">;

export default function RatePlanFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingPlan, isLoading: isLoadingPlan } = useRatePlan(id);
  const createMutation = useCreateRatePlan();
  const updateMutation = useUpdateRatePlan(id || "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<RatePlanFormData>({
    defaultValues: {
      name: "",
      base_price: 0,
      currency: "USD",
      is_active: true,
      deposit_percentage: 0,
      min_nights: 1,
      cancellation_policy: "",
    },
  });

  useEffect(() => {
    if (existingPlan?.data) {
      const plan = existingPlan.data;
      setValue("name", plan.name);
      setValue("base_price", plan.base_price);
      setValue("currency", plan.currency);
      setValue("is_active", plan.is_active);
      setValue("deposit_percentage", plan.deposit_percentage || 0);
      setValue("min_nights", plan.min_nights || 1);
      setValue("cancellation_policy", plan.cancellation_policy || "");
      // @ts-ignore
      setValue("extra_guest_price", (plan as any).extra_guest_price || 0);
      // @ts-ignore
      setValue("included_guests", (plan as any).included_guests || 1);
      // @ts-ignore
      setValue("cancellation_hours", (plan as any).cancellation_hours || 24);
      // @ts-ignore
      setValue("cancellation_fee_percentage", (plan as any).cancellation_fee_percentage || 100);
    }
  }, [existingPlan, setValue]);

  const onSubmit = async (data: RatePlanFormData) => {
    try {
      const payload = {
        ...data,
        base_price: Number(data.base_price),
        extra_guest_price: Number((data as any).extra_guest_price || 0),
        included_guests: Number((data as any).included_guests || 1),
        deposit_percentage: Number(data.deposit_percentage || 0),
        min_nights: Number(data.min_nights || 1),
        cancellation_hours: Number((data as any).cancellation_hours || 0),
        cancellation_fee_percentage: Number((data as any).cancellation_fee_percentage || 0),
      };

      if (isEditing) {
        await updateMutation.mutateAsync(payload as any);
        toast.success("Rate plan updated successfully");
      } else {
        await createMutation.mutateAsync(payload as any);
        toast.success("Rate plan created successfully");
      }
      navigate("/admin/rate-plans");
    } catch (error: any) {
      toast.error(error.message || "Failed to save rate plan");
    }
  };

  if (isEditing && isLoadingPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/rate-plans")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? "Edit Rate Plan" : "Create New Rate Plan"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-stone-50/50">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Early Bird Special, Fully Flexible"
                  {...register("name", { required: "Plan name is required" })}
                  className="bg-white/80 focus:bg-white transition-colors"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      className="pl-7 bg-white/80 focus:bg-white transition-colors"
                      {...register("base_price", {
                        required: "Price is required",
                        min: { value: 0, message: "Price must be positive" },
                      })}
                    />
                  </div>
                  {errors.base_price && (
                    <p className="text-xs text-destructive">{errors.base_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extra_guest_price">Extra Guest Price</Label>
                  <Input
                    id="extra_guest_price"
                    type="number"
                    step="0.01"
                    {...register("extra_guest_price" as any)}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="included_guests">Included Guests</Label>
                  <Input
                    id="included_guests"
                    type="number"
                    {...register("included_guests" as any, { min: 1 })}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    {...register("currency")}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_active"
                  checked={watch("is_active")}
                  onCheckedChange={(checked: boolean) =>
                    setValue("is_active", checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="is_active">Activate this rate plan</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-stone-50/50">
              <CardTitle>Policies & Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit_percentage">Deposit Percentage (%)</Label>
                  <Input
                    id="deposit_percentage"
                    type="number"
                    {...register("deposit_percentage", { min: 0, max: 100 })}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_nights">Minimum Nights</Label>
                  <Input
                    id="min_nights"
                    type="number"
                    {...register("min_nights", { min: 1 })}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cancellation_hours">Cancellation Window (Hours)</Label>
                  <Input
                    id="cancellation_hours"
                    type="number"
                    {...register("cancellation_hours" as any)}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation_fee_percentage">Cancellation Fee (%)</Label>
                  <Input
                    id="cancellation_fee_percentage"
                    type="number"
                    {...register("cancellation_fee_percentage" as any, { min: 0, max: 100 })}
                    className="bg-white/80 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
                <Textarea
                  id="cancellation_policy"
                  placeholder="Describe your cancellation terms..."
                  className="min-h-[100px] bg-white/80 focus:bg-white transition-colors"
                  {...register("cancellation_policy")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/rate-plans")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Save Changes" : "Create Rate Plan"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
