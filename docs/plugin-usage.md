# Plugin Usage

Plugins extend both the Marketplace and the Acacia Camp backend. This guide explains how to find, install, and activate plugins as a platform operator.

---

## What plugins can do

Plugins are loaded server-side by the Acacia Camp backend and can:

- **Add payment gateways** (e.g., Stripe, PayTabs, Fawry)
- **Sync with OTA channels** (e.g., SiteMinder, Booking.com)
- **Extend the loyalty program** (custom reward rules)
- **Inject UI into the admin panel** (new sidebar items, dashboard widgets, settings pages)
- **Inject UI into guest-facing pages** (e.g., upsell widgets on the booking confirmation page)
- **Automate workflows** via n8n integration

---

## Plugin sources

| Source        | Description                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Built-in**  | `stripe`, `ical`, `ical-import`, `loyalty`, `siteminder` — shipped with Acacia Camp                                       |
| **Ecosystem** | Community plugins from [github.com/your-org/sinaicamps-ecosystem](https://github.com/your-org/sinaicamps-ecosystem)             |
| **Custom**    | Build your own using the [Plugin SDK](https://github.com/your-org/sinaicamps-ecosystem/blob/main/docs/plugin-development.md) |

---

## Installing a plugin

All plugin installation happens on the **Acacia Camp** backend, not in the Marketplace. The Marketplace picks up activated plugins automatically via the feature flag and `plugin-manifest.json`.

### Step 1 — Add plugin files

Copy the plugin folder into the `plugins/` directory of your Acacia Camp installation:

```bash
cd acacia-camp
git submodule add https://github.com/community-dev/sinaicamps-my-plugin plugins/my-plugin
# or simply copy the folder
```

### Step 2 — Register in the manifest

Open `plugin-manifest.json` and add an entry:

```json
{
  "plugins": [
    {
      "name": "my-plugin",
      "version": "1.0.0",
      "sinaicampsVersion": ">=2.0.0",
      "path": "./plugins/my-plugin/src/index.ts",
      "enabled": true,
      "config": {
        "API_KEY": "${MY_PLUGIN_API_KEY}"
      }
    }
  ]
}
```

### Step 3 — Add secrets to `.env`

```env
MY_PLUGIN_API_KEY=your-key-here
```

### Step 4 — Enable the plugin runtime flag

```sql
UPDATE feature_flags SET is_enabled = true WHERE name = 'plugin_runtime';
```

### Step 5 — Restart the backend

```bash
npm run dev:server
# or in production:
pm2 restart acacia-camp
```

The plugin's `init(api)` function is called at startup. Check logs for:

```
[PluginLoader] ✓ Loaded plugin: my-plugin v1.0.0
```

---

## Activating built-in plugins

### Stripe payments

```env
# acacia-camp/.env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Enable in `plugin-manifest.json`:

```json
{ "name": "stripe", "enabled": true, "config": { "SECRET_KEY": "${STRIPE_SECRET_KEY}" } }
```

### Loyalty program

```json
{ "name": "loyalty", "enabled": true, "config": {} }
```

The loyalty plugin adds a points tab to the guest portal and exposes admin settings.

### iCal sync (export)

```json
{ "name": "ical", "enabled": true, "config": {} }
```

Exposes `/api/ical/:token` endpoints for each room — paste the URL into Airbnb, VRBO, etc.

### iCal import

```json
{ "name": "ical-import", "enabled": true, "config": {} }
```

Subscribes to external iCal feeds and creates block reservations automatically.

---

## Plugin slots in the Marketplace (guest pages)

Plugins can inject React components into guest-facing pages using the `PluginSlot` system. Slot names available on guest pages:

| Slot name                           | Location                           |
| ----------------------------------- | ---------------------------------- |
| `guest.search.below_results`        | Below search results               |
| `guest.property.below_description`  | Property detail, below description |
| `guest.booking.confirmation_extras` | Booking confirmation page extras   |
| `guest.nav.right`                   | Navigation bar, right side         |

To add a slot to a page:

```tsx
import { PluginSlot } from '@/components/PluginSlot';

<PluginSlot name="guest.search.below_results" />;
```

The slot renders nothing if no plugin has registered a component for it — safe to add speculatively.

---

## Disabling a plugin

Set `"enabled": false` in `plugin-manifest.json` for the plugin, then restart. No data is deleted.

---

## Further reading

- [Full plugin development guide](https://github.com/your-org/sinaicamps-ecosystem/blob/main/docs/plugin-development.md)
- [Hook catalog](https://github.com/your-org/sinaicamps-ecosystem/blob/main/docs/hook-catalog.md)
- [Submission guidelines](https://github.com/your-org/sinaicamps-ecosystem/blob/main/docs/submission-guidelines.md)
