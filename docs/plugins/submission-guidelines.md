# Submission Guidelines

Thank you for contributing to the CampOps Ecosystem. This guide explains how to submit a new plugin, n8n workflow, or other extension.

---

## Types of contributions

| Type                  | Where it lives              |
| --------------------- | --------------------------- |
| Plugin                | `plugins/<name>/`           |
| n8n workflow template | `n8n-workflows/<name>.json` |
| SDK type improvement  | `packages/plugin-sdk/src/`  |
| Documentation fix     | `docs/`                     |

---

## Plugin submission checklist

Before opening a PR, ensure your plugin meets all of the following:

### Code quality

- [ ] Written in TypeScript (`.ts` files), targeting ES2022 + NodeNext module resolution
- [ ] No direct imports from `server/*` paths — only uses the `PluginAPI` interface
- [ ] No hardcoded credentials or secrets — all sensitive values use `api.config.*`
- [ ] All external HTTP calls have a timeout (`AbortController` or equivalent)
- [ ] Errors are caught and logged with `api.logger.error()`, not swallowed silently

### Tests

- [ ] Unit tests in `src/index.test.ts` (Vitest)
- [ ] Tests use the mock PluginAPI pattern (see [plugin-development.md](plugin-development.md))
- [ ] `npm test` passes cleanly
- [ ] `npm run build` (tsc) passes with zero errors

### Documentation

- [ ] `README.md` in the plugin folder (see [README template](#readme-template) below)
- [ ] All config keys documented in the README
- [ ] Any hooks registered are listed with their purpose

### Compatibility

- [ ] `campopsVersion` in `package.json` specifies the minimum compatible version
- [ ] Works with Node.js 20 and 22

### Manifest entry

- [ ] Provide a sample `plugin-manifest.json` entry in your README
- [ ] Config keys use `${ENV_VAR_NAME}` format

---

## README template

Every plugin folder must contain a `README.md`:

````markdown
# <Plugin Name>

> One-line description of what this plugin does.

## What it does

Brief explanation of the plugin's purpose.

## Installation

1. Copy this folder to `plugins/<name>/` in your Acacia Camp installation.
2. Add to `plugin-manifest.json`:
   ```json
   {
     "name": "<name>",
     "version": "x.y.z",
     "campopsVersion": ">=2.0.0",
     "path": "./plugins/<name>/src/index.ts",
     "enabled": true,
     "config": {
       "API_KEY": "${MY_PLUGIN_API_KEY}"
     }
   }
   ```
````

3. Add to your `.env`:
   ```env
   MY_PLUGIN_API_KEY=your-key
   ```
4. Restart Acacia Camp.

## Configuration

| Key              | Required | Description                       |
| ---------------- | -------- | --------------------------------- |
| `API_KEY`        | ✅       | Your API key from the provider    |
| `WEBHOOK_SECRET` | —        | Optional webhook signature secret |

## Hooks registered

| Hook                 | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `payment.initiated`  | Initiates a payment with the external gateway |
| `payment.on_success` | Records the successful payment                |

## License

MIT

```

---

## Submitting a PR

1. **Fork** this repository.
2. Create a feature branch: `git checkout -b plugin/my-plugin-name`
3. Add your plugin to `plugins/<name>/`.
4. Update `server/data/plugin-compat.json` with an initial entry for your plugin (set `unknown` until CI runs).
5. Open a Pull Request with:
   - A clear title: `feat(plugins): add <name> plugin`
   - A description explaining what the plugin does and which hooks it uses
   - A link to any external service documentation

---

## Review process

1. **Automated CI** runs the compatibility matrix (`plugin-compat.yml`) against Node 20 and 22.
2. A maintainer reviews the code for security, code quality, and adherence to these guidelines.
3. If approved, the plugin is merged and listed in the ecosystem README.

Expect a review within **5 business days** for new plugins.

---

## Security policy

- Do not commit API keys, passwords, or secrets in any form.
- If you discover a security issue in an existing plugin, email **security@campops.com** — do not open a public issue.
- Plugins that make outbound HTTP requests to non-documented endpoints will be rejected.

---

## Code of conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be respectful, constructive, and inclusive.
```
