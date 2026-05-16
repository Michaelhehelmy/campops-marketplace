import { useState } from "react";
import { Sliders, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";

const LISTINGS = [
  { id: "listing-001", name: "Acacia Camp" },
  { id: "listing-002", name: "Blue Lagoon Lodge" },
  { id: "listing-003", name: "Highland Retreat" },
];

const FEATURES = [
  {
    key: "pwa_enabled",
    label: "PWA / Offline Mode",
    description: "Enable progressive web app for this listing's guests",
  },
  {
    key: "loyalty_enabled",
    label: "Loyalty Program",
    description: "Allow guests to earn and redeem loyalty points",
  },
  { key: "pos_enabled", label: "Point of Sale", description: "Enable POS ordering system" },
  {
    key: "channel_manager",
    label: "Channel Manager",
    description: "Connect to SiteMinder for OTA sync",
  },
  { key: "ical_sync", label: "iCal Sync", description: "Sync availability to external calendars" },
  {
    key: "commission_rate",
    label: "Custom Commission Rate",
    description: "Override marketplace default commission",
  },
];

export default function FeatureConfigPage() {
  const [selectedListing, setSelectedListing] = useState(LISTINGS[0].id);
  const [features, setFeatures] = useState<Record<string, boolean>>({
    pwa_enabled: true,
    loyalty_enabled: true,
    pos_enabled: false,
    channel_manager: true,
    ical_sync: true,
    commission_rate: false,
  });

  const toggle = (key: string) => setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="feature-config-page"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feature Configuration</h1>
        <p className="text-gray-500 mt-1">
          Configure feature rules and commission rates per listing
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <Card className="p-4 border-none shadow-sm rounded-3xl">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Listings
            </h3>
            <div className="space-y-1">
              {LISTINGS.map((l) => (
                <button
                  key={l.id}
                  id={`listing-select-${l.id}`}
                  onClick={() => setSelectedListing(l.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    selectedListing === l.id
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-4">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <Sliders className="text-emerald-600" size={20} />
              <h2 className="font-bold text-gray-900">
                Features for: {LISTINGS.find((l) => l.id === selectedListing)?.name}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {FEATURES.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{feature.label}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{feature.description}</div>
                  </div>
                  <button
                    id={`toggle-${feature.key}`}
                    onClick={() => toggle(feature.key)}
                    role="switch"
                    aria-checked={features[feature.key]}
                    className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      features[feature.key] ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mx-0.5 ${
                        features[feature.key] ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <button
            id="save-feature-config-btn"
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
