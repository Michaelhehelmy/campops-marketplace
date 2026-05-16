import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Activity } from "@/types/api";
import { Clock, Users, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

export default function ActivitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.activities,
    queryFn: () => get<{ data: Activity[] }>("/activities"),
    staleTime: 1000 * 60,
  });

  const activities = data?.data ?? [];

  const handleBook = (activity: Activity) => {
    toast.success(`Booking request sent for ${activity.name}!`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" data-testid="activities-heading">
        Activities
      </h1>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="no-activities">
              No activities available at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6" data-testid="activities-grid">
          {activities.map((a) => (
            <Card key={a.id}>
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt={a.name}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{a.name}</CardTitle>
                  <Badge variant={a.is_active ? "success" : "secondary"}>
                    {a.is_active ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {a.description && (
                  <p className="text-sm text-muted-foreground mb-3">{a.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {a.duration_minutes}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> Max {a.max_capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} /> ${a.base_price}
                  </span>
                </div>
                <Button
                  className="w-full"
                  disabled={!a.is_active}
                  onClick={() => handleBook(a)}
                  data-testid="book-activity-btn"
                >
                  Book Activity
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
