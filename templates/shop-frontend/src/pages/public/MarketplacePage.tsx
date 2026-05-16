/**
 * Marketplace Page
 * Public retail catalog displaying POS items
 */

import { useMarketplaceItems } from "@/hooks/queries/useActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import { Search, ShoppingBag, Package, Store } from "lucide-react";
import type { POSItem } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

function ItemCard({ item }: { item: POSItem }) {
  return (
    <Card className="h-full flex flex-col overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-muted relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Package className="h-20 w-20 text-primary/30" />
          </div>
        )}
        {item.category_name && (
          <Badge className="absolute top-3 right-3" variant="secondary">
            {item.category_name}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{item.name}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {item.description || "Quality retail item available for purchase during your stay."}
        </p>

        <div className="mt-auto pt-4 border-t flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(item.price || 0)}</p>
          </div>
          <Button variant="outline" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <Skeleton className="aspect-square" />
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <div className="mt-auto pt-4 border-t flex items-center justify-between">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const { data: items = [], isLoading } = useMarketplaceItems();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Retail Marketplace</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Explore our curated selection of retail items, souvenirs, and essentials. Available for
            purchase during your stay.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-6">
            Showing {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Items Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ItemSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search terms" : "Check back soon for new products"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
