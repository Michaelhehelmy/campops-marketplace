import { useRatePlans, useDeleteRatePlan } from "@/hooks/queries/useRatePlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { DollarSign, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function RatePlansPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRatePlans();
  const deleteMutation = useDeleteRatePlan();

  const plans = data?.data ?? [];

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this rate plan?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Rate plan deleted");
      } catch (error: any) {
        toast.error(error.message || "Failed to delete");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="rate-plans-heading">
          Rate Plans
        </h1>
        <Link to="/admin/rate-plans/new">
          <Button className="shadow-lg shadow-primary/20" data-testid="add-rate-plan-btn">
            <Plus className="h-4 w-4 mr-2" />
            Add Rate Plan
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed border-2 bg-stone-50/50" data-testid="rate-plans-empty">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No rate plans defined.</p>
            <Link to="/admin/rate-plans/new">
              <Button variant="outline">Create your first plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="rate-plans-grid">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              data-testid={`rate-plan-card-${plan.id}`}
              className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white/50 backdrop-blur-sm"
            >
              <CardHeader className="pb-2 bg-stone-50/50 group-hover:bg-sand/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-serif">{plan.name}</CardTitle>
                    <Badge variant={plan.is_active ? "success" : "secondary"}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => navigate(`/admin/rate-plans/${plan.id}`)}
                      data-testid="edit-rate-plan"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(plan.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold">
                      Pricing
                    </span>
                    <span className="font-bold text-lg text-oasis">
                      {plan.currency} {plan.base_price}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold">
                      Min Stay
                    </span>
                    <span className="font-medium">
                      {plan.min_nights || 1} {plan.min_nights === 1 ? "night" : "nights"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold">
                      Deposit
                    </span>
                    <span className="font-medium">{plan.deposit_percentage || 0}%</span>
                  </div>
                </div>
                {plan.cancellation_policy && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <span className="font-semibold mr-1">Policy:</span>
                      {plan.cancellation_policy}
                    </p>
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
