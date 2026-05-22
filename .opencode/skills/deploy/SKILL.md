---
name: deploy-to-oracle
description: Build SinaiCamps locally and deploy to Oracle VM via rsync
---

## When to use
When the user asks to deploy, push to production, or update the live site.

## Steps
1. Ensure `.env.production` exists — copy from `.env` if missing
2. Run the build:
   ```bash
   export NODE_OPTIONS=--max-old-space-size=4096
   npm run build
   ```
3. Verify `.next/standalone/server.js` was created
4. Run the deploy script:
   ```bash
   ./scripts/deploy-sinaicamps.sh
   ```
5. Confirm deployment:
   ```bash
   ssh -i ~/Downloads/oracle.key ubuntu@84.235.239.6 "pm2 list && tail -5 ~/deploy.log"
   ```
6. Verify `sinaicamps` shows as `online` in PM2

## Important
- Never commit `.env.production` to git
- If rsync fails, check that Oracle VM is reachable: `ping 84.235.239.6`
- If PM2 shows `errored`, SSH in and check: `pm2 logs sinaicamps --lines 50`
