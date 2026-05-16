/**
 * Excursions Page
 * Public page displaying available activities/excursions
 */

import { usePublicActivities } from "@/hooks/queries/useActivities";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users, MapPin, Search, ArrowRight, Compass } from "lucide-react";
import type { Activity } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

function ActivityCard({
  activity,
  onBook,
  isAuthenticated: _isAuthenticated,
}: {
  activity: Activity;
  onBook: (activity: Activity) => void;
  isAuthenticated: boolean;
}) {
  const duration = activity.duration_minutes || 60;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ""}` : `${minutes}m`;

  return (
    <Card className="h-full flex flex-col overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {activity.image_url ? (
          <img
            src={activity.image_url}
            alt={activity.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Compass className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <Badge className="absolute top-3 right-3" variant="secondary">
          {activity.category}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-xl line-clamp-1">{activity.name}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {activity.description ||
            "Experience the adventure of a lifetime with our guided excursion."}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{durationText}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Up to {activity.max_capacity} guests</span>
          </div>
          {activity.requirements && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{activity.requirements}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(activity.base_price || 0)}
            </p>
          </div>
          <Button onClick={() => onBook(activity)} className="gap-2">
            Book Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="mt-auto pt-4 border-t flex items-center justify-between">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExcursionsPage() {
  const { data: activities = [], isLoading } = usePublicActivities();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleBook = (activity: Activity) => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/excursions&book=${activity.id}`);
      return;
    }

    // Navigate to booking form
    navigate(`/guest/activities?activity=${activity.id}`);
  };

  const filteredActivities = activities.filter(
    (activity) =>
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Adventures Await</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Discover curated excursions and experiences designed to make your stay unforgettable.
            From desert safaris to cultural tours, find your perfect adventure.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search excursions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-6">
            Showing {filteredActivities.length} excursion
            {filteredActivities.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Activities Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onBook={handleBook}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Compass className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No excursions found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Check back soon for new adventures"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
