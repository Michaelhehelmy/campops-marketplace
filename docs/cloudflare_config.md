# Cloudflare Setup Guide for SinaiCamps

This guide explains how to connect your **Oracle Cloud VM** (The Backend) and **Cloudflare Pages** (The Listing Frontends) for a professional, secure, and automated setup.

---

## 1. The Backend: Cloudflare Tunnel (Recommended)
Instead of opening firewall ports on Oracle Cloud, use a **Cloudflare Tunnel**. It creates a secure bridge between your VM and Cloudflare.

### Steps to Setup:
1.  **Go to Cloudflare Zero Trust Dashboard**:
    *   Navigate to **Networks** > **Tunnels**.
    *   Click **Create a Tunnel** and name it `sinaicamps-backend`.
2.  **Install on Oracle VM**:
    *   Copy the installation command for "Debian" or "Ubuntu" provided by Cloudflare.
    *   Run it on your Oracle VM via SSH.
3.  **Configure Public Hostnames**:
    *   In the Tunnel settings, add these hostnames:
        *   `sinaicamps.com` -> `http://localhost:3000`
        *   `api.sinaicamps.com` -> `http://localhost:3000`

---

## 2. The Marketplace Domain (`sinaicamps.com`)
This is your main platform where owners list their camps.

### DNS Settings:
*   **A Record**: Name `@`, Content `129.151.224.102` (Set to **DNS Only** initially).
*   **A Record**: Name `api`, Content `129.151.224.102` (Set to **DNS Only** initially).
*   **SSL/TLS Mode**: Set to **Full (Strict)**.

---

## 3. The Listing Sites (e.g., `acaciacamp.com`)
These are high-performance "build frontends" hosted on **Cloudflare Pages**.

### Project Build Settings:
1.  **Framework Preset**: `Next.js (Static Export)` or `None`.
2.  **Build Command**: `npm run build`
3.  **Build Output Directory**: `.next`
4.  **Root Directory**: `/`

### Environment Variables:
In your Pages project settings, add these variables to "Environment Variables":
*   **`NEXT_PUBLIC_TENANT_ID`**: `acacia-1` (Match the ID in your database).
*   **`NEXT_PUBLIC_API_URL`**: `https://api.sinaicamps.com`
*   **`NODE_VERSION`**: `20`

### Custom Domain:
1.  Go to the **Custom Domains** tab in your Pages project.
2.  Add `acaciacamp.com`.
3.  Cloudflare will handle the DNS and SSL automatically.

---

## 4. Automation & Sync
Every time you push code to your **GitHub `main` branch**:
1.  **Oracle Cloud** (via GitHub Actions) pulls the latest backend logic.
2.  **Cloudflare Pages** automatically rebuilds every listing site.
3.  All your camps get the latest features instantly without you doing anything.

---

## 5. Security Checklist
- [ ] **SSL/TLS**: Always use "Full (Strict)" in Cloudflare.
- [ ] **WAF**: Enable the "Cloudflare Managed Ruleset" for SinaiCamps.com to block bots.
- [ ] **CORS**: Ensure your Oracle Nginx config allows requests from your listing domains.
