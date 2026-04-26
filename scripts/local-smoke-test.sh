#!/usr/bin/env bash
# scripts/local-smoke-test.sh — smoke-test packages locally using npm pack
#
# Usage (no npm publish or NPM_TOKEN required):
#   ./scripts/local-smoke-test.sh
#
# The script:
#   1. Builds all packages (runs npm run build).
#   2. Packs each package into a tarball with npm pack.
#   3. Creates a temporary standalone project that installs the tarballs
#      directly — no workspace resolution, no live npm registry.
#   4. Verifies that the key exports (OdaClient, createOpenClawPlugin) are
#      importable from the packed artifacts.
#
# This is the recommended way to verify the published tarball contents before
# running 'publish.yml' for real.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PACK_DIR="$(mktemp -d)"
SMOKE_DIR="$(mktemp -d)"
trap 'rm -rf "$PACK_DIR" "$SMOKE_DIR"' EXIT

echo "==> Building all packages..."
cd "$ROOT_DIR"
npm run build

echo "==> Packing packages..."
# npm pack must be run from the workspace root; it writes tarballs into the
# current working directory. We pass --pack-destination to put them in PACK_DIR.
cd "$ROOT_DIR"

CORE_TGZ="$PACK_DIR/$(npm pack --workspace=packages/core \
  --pack-destination "$PACK_DIR" | tail -1)"
PLUGIN_TGZ="$PACK_DIR/$(npm pack --workspace=packages/openclaw-plugin \
  --pack-destination "$PACK_DIR" | tail -1)"

echo "    core tarball:   $CORE_TGZ"
echo "    plugin tarball: $PLUGIN_TGZ"

echo "==> Creating temp standalone project..."
cat > "$SMOKE_DIR/package.json" <<EOF
{
  "name": "local-smoke-test",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "@oda-agent/core": "$CORE_TGZ",
    "@oda-agent/openclaw-plugin": "$PLUGIN_TGZ"
  }
}
EOF

cp "$SCRIPT_DIR/verify-imports.cjs" "$SMOKE_DIR/"

cd "$SMOKE_DIR"

echo "==> Running npm install from local tarballs..."
npm install

echo "==> Verifying imports..."
node verify-imports.cjs

echo "==> Local smoke test passed ✓"
echo "    Packages look good — safe to publish to npm."
