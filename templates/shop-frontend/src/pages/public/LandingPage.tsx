import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BedDouble, UtensilsCrossed, Calendar, Star, MapPin, Phone } from "lucide-react";
import { usePublicSettings } from "@/hooks/queries/usePublic";
import { useBranding } from "@/contexts/BrandingContext";
import { DEFAULT_IMAGES } from "@/constants/images";

import { BrandLogo } from "@/components/branding/BrandLogo";

export default function LandingPage() {
  const { data: settings } = usePublicSettings();
  const branding = useBranding();

  const defaultFeatures = [
    {
      icon: <BedDouble className="h-8 w-8" />,
      title: "Traditional Huts",
      desc: "Stay in handcrafted arishas and bungalows with organic sea-view terraces.",
      img: DEFAULT_IMAGES.HUT,
    },
    {
      icon: <UtensilsCrossed className="h-8 w-8" />,
      title: "Bedouin Kitchen",
      desc: "Savor farm-to-table cuisine prepared over open fires by local artisans.",
      img: DEFAULT_IMAGES.KITCHEN,
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Desert Safaris",
      desc: "Discover hidden canyons and ancient trails between the mountains.",
      img: DEFAULT_IMAGES.DESERT,
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: "Stargazing",
      desc: "Unrivaled views of the cosmos far from the city lights.",
      img: DEFAULT_IMAGES.STARS,
    },
  ];

  // Try to parse features from config if it exists
  let features = defaultFeatures;
  if (settings?.features_config) {
    try {
      const parsed = JSON.parse(settings.features_config);
      if (Array.isArray(parsed)) {
        features = parsed.map((f: any, i: number) => ({
          ...f,
          icon: defaultFeatures[i % defaultFeatures.length].icon, // Retain icons for now unless specified
        }));
      }
    } catch (e) {
      console.error("Failed to parse features_config", e);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Full-bleed Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.hero_image_url || DEFAULT_IMAGES.HERO_MAIN}
            alt="Sinai Coast at sunset"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-charcoal/30 backdrop-blur-[2px]" />
        </div>

        <div className="container relative z-10 mx-auto max-w-6xl px-6 text-center text-white">
          <BrandLogo color="white" className="scale-150 mb-10 opacity-90" />
          <h1 className="font-serif text-6xl md:text-8xl mb-6 drop-shadow-xl leading-tight">
            {settings?.hero_title || `Welcome to ${branding.appName}`}
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto font-light drop-shadow-lg opacity-90">
            {settings?.hero_subtitle ||
              "A serene Bedouin escape where the Sinai mountains meet the crystal waters of the Red Sea."}
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <Button
              variant="clay"
              size="lg"
              asChild
              className="rounded-full px-10 h-14 text-lg shadow-2xl shadow-clay/20"
            >
              <Link to="/availability">Book Your Stay</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full px-10 h-14 text-lg border-white/40 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              <Link to="/rooms">Explore Huts</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Heritage Section */}
      <section className="py-24 px-6 bg-sand border-y border-stone-200">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-8 text-charcoal">
            {settings?.heritage_title || "Handcrafted Luxury under Million Stars"}
          </h2>
          <p className="text-lg text-charcoal/80 max-w-3xl mx-auto leading-relaxed">
            {settings?.heritage_description ||
              'Experience the "million-star luxury" of traditional Bedouin hospitality. Our sustainable eco-lodge blends simple, rustic elegance with handcrafted textures, offering a tactile connection to the desert landscape.'}
          </p>
        </div>
      </section>

      {/* Features / Experience */}
      <section className="py-24 px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <h2 className="font-serif text-4xl text-center mb-16 text-charcoal">
            The Spirit of the Desert
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group overflow-hidden border-none hover:translate-y-[-8px] transition-transform duration-300"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand text-acacia mb-4 shadow-sm">
                    {f.icon}
                  </div>
                  <h3 className="font-serif text-xl mb-3 text-charcoal">{f.title}</h3>
                  <p className="text-sm text-charcoal/70 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Teaser Section */}
      <section className="py-24 px-6 bg-charcoal text-white overflow-hidden relative">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
            <div className="max-w-xl">
              <h2 className="font-serif text-4xl md:text-5xl mb-6">
                {settings?.gallery_teaser_title || "Lens on Sinai"}
              </h2>
              <p className="text-xl text-sand/60">
                {settings?.gallery_teaser_description ||
                  `A visual journey through the golden mountains, the crystal sea, and the soulful architecture of ${branding.appName}.`}
              </p>
            </div>
            <Button variant="clay" size="lg" asChild className="rounded-full px-10 h-14 text-lg">
              <Link to="/gallery">View Full Gallery</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              DEFAULT_IMAGES.HERO_THUMB,
              DEFAULT_IMAGES.HUT,
              DEFAULT_IMAGES.DESERT,
              DEFAULT_IMAGES.STARS,
            ].map((img, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl overflow-hidden group">
                <img
                  src={img}
                  alt="Gallery teaser"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map & Location Section */}
      <section className="py-24 px-6 bg-sand">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-charcoal/5 p-8 rounded-[2rem] border border-charcoal/10">
                <h3 className="font-serif text-2xl mb-4 text-charcoal">
                  {settings?.location_title || "Find Us in the Heart of Sinai"}
                </h3>
                <p className="text-charcoal/70 mb-8">
                  {settings?.location_description ||
                    "We are located on the serene shores of Nuweiba, where the desert meets the Red Sea. A place of peace, far from the bustling tourist trails."}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-charcoal">
                    <MapPin className="h-5 w-5 text-acacia" />
                    <span>{settings?.location_description || "Nuweiba, South Sinai, Egypt"}</span>
                  </div>
                  <div className="flex items-center gap-4 text-charcoal">
                    <Phone className="h-5 w-5 text-acacia" />
                    <span>{settings?.contact_phone || "+20 106 666 4447"}</span>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="mt-8 rounded-full border-charcoal text-charcoal hover:bg-charcoal/5"
                >
                  <Link to="/contact">Get Directions & Contact</Link>
                </Button>
              </div>
            </div>
            <div className="order-1 lg:order-2 h-[450px] rounded-[3rem] overflow-hidden shadow-2xl relative">
              <img
                src={DEFAULT_IMAGES.SINAI_LANDSCAPE}
                alt="Sinai Map"
                className="w-full h-full object-cover grayscale opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 bg-acacia rounded-full flex items-center justify-center animate-bounce shadow-xl shadow-acacia/50">
                  <MapPin className="text-white h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.cta_image_url || DEFAULT_IMAGES.HERO_MAIN}
            alt="Beach background"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl text-center bg-white/40 backdrop-blur-md p-16 rounded-3xl border border-white/50 shadow-2xl shadow-acacia/5">
          <h2 className="font-serif text-4xl md:text-5xl mb-6 text-charcoal">
            {settings?.cta_title || "Reconnect with Nature"}
          </h2>
          <p className="text-xl text-charcoal/80 mb-10">
            {settings?.cta_description ||
              `Join us at ${branding.appName} for an unforgettable journey.`}
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" variant="clay" className="rounded-full px-12 h-14 text-lg">
              <Link to="/availability">Check Availability</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
