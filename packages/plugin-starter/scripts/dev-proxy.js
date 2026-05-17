#!/usr/bin/env node
/**
 * SinaiCamps Plugin Dev Proxy
 * ─────────────────────────
 * Registers this plugin with a running local SinaiCamps instance and hot-reloads
 * it when source files change.
 *
 * Usage:
 *   CAMPOPS_URL=http://localhost:5000 CAMPOPS_API_KEY=dev npm run proxy
 *
 * How it works:
 *   1. Watches src/ for changes via fs.watch.
 *   2. On change: runs `tsc --noEmit` to type-check, then POSTs the plugin
 *      entry path to the SinaiCamps /api/plugins/reload endpoint (requires
 *      admin API key).
 *   3. The server responds with the new plugin load status.
 */

import { watch } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CAMPOPS_URL = process.env.CAMPOPS_URL ?? 'http://localhost:5000';
const CAMPOPS_API_KEY = process.env.CAMPOPS_API_KEY ?? '';
const PLUGIN_NAME =
  JSON.parse((await import('node:fs')).readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
    .sinaicamps?.pluginId ?? 'my-plugin';

console.log(`[dev-proxy] Watching ${ROOT}/src for changes…`);
console.log(`[dev-proxy] Target: ${CAMPOPS_URL}  plugin: ${PLUGIN_NAME}`);

let debounce;

watch(resolve(ROOT, 'src'), { recursive: true }, (event, filename) => {
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    console.log(`\n[dev-proxy] Change detected: ${filename} — rebuilding…`);
    try {
      execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'inherit' });
      console.log('[dev-proxy] Type-check passed. Triggering hot-reload…');

      const res = await fetch(`${CAMPOPS_URL}/api/plugins/reload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': CAMPOPS_API_KEY,
        },
        body: JSON.stringify({ pluginName: PLUGIN_NAME }),
      });

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`[dev-proxy] ✓ Plugin reloaded:`, body);
      } else {
        console.error(`[dev-proxy] ✗ Reload failed (${res.status}):`, body);
      }
    } catch (err) {
      console.error('[dev-proxy] Type-check or reload error:', err.message);
    }
  }, 300);
});
