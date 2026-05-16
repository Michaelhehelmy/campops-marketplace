# n8n Workflows

CampOps integrates with [n8n](https://n8n.io) to provide no-code automation for camp operators. This page documents the available workflow templates and how to use them.

---

## What is n8n?

n8n is an open-source workflow automation tool — think Zapier but self-hosted. It connects to the CampOps API via webhooks and REST calls to automate repetitive tasks.

---

## Setting up n8n

### Option 1 — Docker (recommended)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -e WEBHOOK_URL=https://n8n.yourcamp.com \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

### Option 2 — npm

```bash
npm install -g n8n
n8n start
```

Open **http://localhost:5678** in your browser.

---

## Importing a workflow template

1. Open n8n.
2. Click **Workflows** → **Import from file**.
3. Select a `.json` file from the `n8n-workflows/` folder in this repository.
4. Configure credentials (API key, SMTP, etc.).
5. Activate the workflow.

---

## Available templates

### 1. Booking Confirmation Email (`booking-confirmation-email.json`)

**Trigger:** CampOps webhook → `booking.created`  
**Actions:** Send a branded HTML email to the guest via SMTP

**Setup:**

1. In Acacia Camp, create a webhook pointing to your n8n instance:
   ```
   POST https://n8n.yourcamp.com/webhook/booking-confirmation
   Event: booking.created
   ```
2. Configure n8n SMTP credentials.
3. Customise the HTML email template inside the workflow.

---

### 2. WhatsApp Booking Notification (`whatsapp-booking-alert.json`)

**Trigger:** CampOps webhook → `booking.created`  
**Actions:** Send a WhatsApp message to the property manager via Twilio or WA Business API

**Setup:**

1. Add Twilio credentials in n8n.
2. Set `MANAGER_PHONE` in the workflow variables.

---

### 3. Low Inventory Alert (`low-inventory-alert.json`)

**Trigger:** Scheduled (every morning at 8 AM)  
**Actions:**

1. Call `GET /api/inventory?propertyId=...`
2. Filter items where `quantity < threshold`
3. Send a summary Slack message or email

**Setup:**

1. Set your CampOps API URL and Bearer token in n8n credentials.
2. Set `SLACK_WEBHOOK_URL` or SMTP credentials.
3. Adjust `quantity_threshold` (default: 5).

---

### 4. Checkout Review Request (`checkout-review-request.json`)

**Trigger:** CampOps webhook → `booking.checkout`  
**Actions:** Wait 2 hours, then send a review request email with a Google Reviews or TripAdvisor link

---

### 5. Nightly Occupancy Report (`nightly-report.json`)

**Trigger:** Scheduled (every night at 11 PM)  
**Actions:**

1. Fetch reservations for today from Acacia Camp API
2. Calculate occupancy rate, revenue, and upcoming arrivals
3. Email summary to the property owner

---

### 6. OTA Sync Health Check (`ota-sync-health.json`)

**Trigger:** Scheduled (every hour)  
**Actions:**

1. Fetch the last OTA sync log from `/api/ota/logs`
2. If last sync is > 2 hours ago, send a Slack alert
3. Optionally trigger a manual sync via `POST /api/ota/sync`

---

## Building a custom workflow

All CampOps API endpoints are accessible from n8n using the **HTTP Request** node with:

- **URL:** `https://api.yourcamp.com/api/...`
- **Authentication:** Bearer token (set in n8n credentials)
- **Header:** `X-Property-Id: your-property-uuid`

**Example — fetch today's reservations:**

```
Method: GET
URL: https://api.yourcamp.com/api/reservations?checkIn=today
Headers:
  Authorization: Bearer {{$credentials.campopsApi.token}}
  X-Property-Id: {{$env.PROPERTY_ID}}
```

---

## Contributing a workflow template

1. Build and test your workflow in n8n.
2. Export it as JSON: **Workflow** → **Export**.
3. Remove any credentials or sensitive values (replace with placeholder strings).
4. Add a `README.md` block at the top of the JSON in the `"meta"` field describing what the workflow does.
5. Submit a PR to this repository under `n8n-workflows/`.

See [submission-guidelines.md](submission-guidelines.md) for the full process.

---

## CampOps webhooks reference

Enable webhook sending in Acacia Camp settings. Supported events:

| Event                  | Fired when                |
| ---------------------- | ------------------------- |
| `booking.created`      | New reservation confirmed |
| `booking.cancelled`    | Reservation cancelled     |
| `booking.checkin`      | Guest checked in          |
| `booking.checkout`     | Guest checked out         |
| `payment.on_success`   | Payment completed         |
| `order.created`        | POS order placed          |
| `order.status_changed` | Order status update       |
