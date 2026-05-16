import { useGalleries, type Gallery } from "@/hooks/queries/useMedia";
import { type MediaItem } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Camera, Heart, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePublicSettings } from "@/hooks/queries/usePublic";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";

export default function GalleryPage() {
  const { data: galleries, isLoading, error } = useGalleries();
  const { data: settings } = usePublicSettings();
  const branding = useBranding();

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-6">
        <div className="flex flex-col items-center mb-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !galleries) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Camera className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-serif">Something went wrong</h2>
        <p className="text-muted-foreground">We couldn't load the gallery at this time.</p>
        <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand/30 pb-24">
      {/* Header Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-serif text-charcoal mb-6">Visual Journey</h1>
          <p className="text-xl text-charcoal/70 max-w-2xl mx-auto">
            Explore the magic of {branding.appName} through our lens and the experiences of our
            wonderful guests.
          </p>
        </div>
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 -z-10 opacity-10">
          <Camera className="h-64 w-64 -mr-20 -mt-10" />
        </div>
      </section>

      {/* Gallery Sections */}
      <div className="container mx-auto px-6 space-y-24">
        {galleries.map((gallery: Gallery) => (
          <section key={gallery.id} id={gallery.id} className="scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif text-charcoal">{gallery.name}</h2>
                {gallery.description && (
                  <p className="text-charcoal/60 mt-2 text-lg">{gallery.description}</p>
                )}
              </div>
              <div className="text-sm font-medium text-acacia bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-acacia/10">
                {gallery.items?.length || 0} Photographs
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.items?.map((item: MediaItem & { sort_order: number }, idx: number) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border-none shadow-lg hover:shadow-2xl transition-all duration-500",
                    // Occasional wide ones for visual interest
                    idx % 7 === 0 ? "md:col-span-2" : ""
                  )}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.original_filename || "Gallery image"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  </div>

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/40 transition-colors cursor-pointer">
                      <ZoomIn className="h-6 w-6" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/40 transition-colors cursor-pointer">
                      <Heart className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Metadata if available */}
                  {item.metadata?.caption && (
                    <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-sm font-medium">{item.metadata.caption}</p>
                      {item.uploaded_by && (
                        <p className="text-xs opacity-70 mt-1">Captured by {item.uploaded_by}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {(!gallery.items || gallery.items.length === 0) && (
              <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-charcoal/10">
                <Camera className="h-12 w-12 text-charcoal/20 mx-auto mb-4" />
                <p className="text-charcoal/40 italic">
                  New memories coming soon to this collection...
                </p>
              </div>
            )}
          </section>
        ))}

        {galleries.length === 0 && (
          <div className="text-center py-40">
            <Camera className="h-24 w-24 text-charcoal/10 mx-auto mb-8" />
            <h3 className="text-2xl font-serif text-charcoal/50">Our lens is getting ready</h3>
            <p className="text-charcoal/40 mt-2">
              Check back soon for a visual feast of {branding.appName}.
            </p>
          </div>
        )}
      </div>

      {/* Specialized Guest Section Call-to-Action */}
      <section className="container mx-auto px-6 mt-32">
        <div className="bg-charcoal text-white rounded-[3rem] p-12 md:p-20 relative overflow-hidden text-center md:text-left">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
              {settings?.gallery_cta_title || "Share Your Acacia Moments"}
            </h2>
            <p className="text-xl text-sand/70 mb-10">
              {settings?.gallery_cta_description ||
                'Captured a stunning sunset? A hidden mountain trail? Tag us or upload your photos to be featured in our "By Our Guests" curated gallery.'}
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Button variant="clay" size="lg" className="rounded-full px-8 h-14 text-lg">
                Tag @acacia_camp
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-14 text-lg border-sand/30 text-sand hover:bg-sand/10"
              >
                Contact to Feature
              </Button>
            </div>
          </div>

          {/* Decorative background camera aperture / shutter */}
          <div className="absolute -right-20 -bottom-20 opacity-10">
            <div className="h-96 w-96 rounded-full border-[40px] border-sand" />
          </div>
        </div>
      </section>
    </div>
  );
}
