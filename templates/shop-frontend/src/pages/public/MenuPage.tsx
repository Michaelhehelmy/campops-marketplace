/**
 * Digital Menu Page (Public)
 * Read-only display of available POS items grouped by category
 * Fetches GET /api/pos_items?is_available=true (via generic CRUD)
 */

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { POSItem } from "@/types/api";

export default function MenuPage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["public_menu"],
    queryFn: async () => {
      const response = await get<POSItem[]>("/public/menu");
      return response;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const rawData = items as any;
  const allItems = Array.isArray(rawData) ? rawData : rawData?.data || [];

  // If API returns already grouped data [{ name: string, items: POSItem[] }]
  const isGrouped =
    allItems.length > 0 &&
    allItems[0] &&
    typeof allItems[0] === "object" &&
    "items" in allItems[0] &&
    Array.isArray(allItems[0].items);

  const grouped = isGrouped
    ? allItems.reduce((acc: any, cat: any) => {
        acc[cat.name] = cat.items;
        return acc;
      }, {})
    : allItems.reduce<Record<string, POSItem[]>>((acc, item: any) => {
        const cat = item.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});

  const categories = Object.keys(grouped).sort();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Menu</h1>
      <p className="text-muted-foreground mb-8">
        Fresh, locally-sourced dishes prepared with care.
      </p>

      {categories.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Menu items coming soon.</p>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 capitalize">{category}</h2>
          <div className="space-y-3">
            {grouped[category].map((item) => (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{item.name}</h3>
                        {item.requires_preparation && (
                          <Badge variant="secondary" className="text-xs">
                            Made to order
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.allergens && item.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.allergens.map((a) => (
                            <Badge key={a} variant="outline" className="text-xs">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-semibold whitespace-nowrap">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
