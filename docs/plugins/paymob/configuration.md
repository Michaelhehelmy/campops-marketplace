# Paymob Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Paymob**
2. Click **Install** then **Enable**
3. Enter API credentials from Paymob dashboard

## Configuration

This plugin requires Paymob API credentials configured through environment variables or plugin settings:

### Credentials
```typescript
{
  hmacSecret: "YOUR_HMAC_SECRET",    // HMAC key from Paymob dashboard
  apiKey: "YOUR_API_KEY",            // Paymob API key
  integrationId: "YOUR_INTEGRATION_ID"
}
```

### Webhook Endpoint
Configure the Paymob dashboard to send transaction callbacks to:
```
POST https://yoursite.com/api/p/paymob/webhook
```

### Return URL
Configure Paymob to redirect customers to:
```
GET https://yoursite.com/api/p/paymob/return
```

### Database
Creates `plugin_paymob_transactions` table to store payment transaction records.
