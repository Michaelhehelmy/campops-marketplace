#!/bin/bash
# =============================================================================
# SinaiCamps — OpenCode Workspace Bootstrap
# Run ONCE on any new machine after cloning the repo.
# Usage: bash .opencode/setup.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${1}${NC}"; }

log "${GREEN}========================================${NC}"
log "${GREEN}  SinaiCamps OpenCode Workspace Setup${NC}"
log "${GREEN}========================================${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Node.js check ─────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  log "${RED}ERROR: Node.js not found. Install Node.js 18+ first.${NC}"
  exit 1
fi
NODE_VERSION=$(node --version)
log "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# ── 2. Install vendored MCPs ──────────────────────────────────────────────────
log "${YELLOW}📦 Installing vendored MCP servers...${NC}"
npm install --prefer-offline 2>/dev/null || npm install
log "${GREEN}✅ MCP servers installed${NC}"

# ── 3. Build custom MCPs (lighthouse, better-auth, mailgun) ──────────────────
log "${YELLOW}🔧 Building custom local MCP servers...${NC}"
cd "$SCRIPT_DIR/.."

if [ -f "packages/mcp-server-lighthouse/package.json" ]; then
  cd packages/mcp-server-lighthouse && npm install --silent && cd ../..
  log "${GREEN}  ✅ lighthouse MCP ready${NC}"
fi

if [ -f "packages/better-auth-mcp/package.json" ]; then
  cd packages/better-auth-mcp && npm install --silent && cd ../..
  log "${GREEN}  ✅ better-auth MCP ready${NC}"
fi

if [ -f "packages/mcp-server-mailgun/package.json" ]; then
  cd packages/mcp-server-mailgun && npm install --silent && cd ../..
  log "${GREEN}  ✅ mailgun MCP ready${NC}"
fi

# ── 4. LSP servers check ─────────────────────────────────────────────────────
log "${YELLOW}🔍 Checking LSP servers...${NC}"

if command -v typescript-language-server &>/dev/null; then
  log "${GREEN}  ✅ TypeScript LSP found${NC}"
else
  log "${YELLOW}  ⚠️  TypeScript LSP missing. Installing globally...${NC}"
  npm install -g typescript-language-server typescript
fi

if command -v tailwindcss-language-server &>/dev/null; then
  log "${GREEN}  ✅ TailwindCSS LSP found${NC}"
else
  log "${YELLOW}  ⚠️  TailwindCSS LSP missing. Installing globally...${NC}"
  npm install -g @tailwindcss/language-server
fi

# ── 5. OpenCode check ─────────────────────────────────────────────────────────
log "${YELLOW}🔍 Checking OpenCode installation...${NC}"
if command -v opencode &>/dev/null; then
  log "${GREEN}  ✅ OpenCode: $(opencode --version 2>/dev/null || echo 'installed')${NC}"
else
  log "${YELLOW}  ⚠️  OpenCode not found. Install it: curl -fsSL https://opencode.ai/install | sh${NC}"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
log ""
log "${GREEN}========================================${NC}"
log "${GREEN}  ✅ Setup complete!${NC}"
log "${GREEN}========================================${NC}"
log ""
log "  Run: ${YELLOW}opencode${NC}"
log "  Agents available: ${YELLOW}@deploy @qa @db @plugin-dev${NC}"
log "  Skills in: ${YELLOW}.opencode/skills/${NC}"
log "  Tools in:  ${YELLOW}.opencode/tools/${NC}"
log ""
