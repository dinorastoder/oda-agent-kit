#!/usr/bin/env bash
# scripts/smoke-test.sh — verify published packages are importable from npm
#
# Usage (requires packages to already be published to npm):
#   ./scripts/smoke-test.sh 0.1.0
#   ./scripts/smoke-test.sh 0.1.0-alpha.1
#
# The script:
#   1. Creates a temporary standalone project (outside the workspace).
#   2. Installs @oda-agent/core and @oda-agent/openclaw-plugin at the given
#      version from the npm registry (no workspace resolution).
#   3. Runs scripts/verify-imports.cjs to confirm that the key exports
#      (OdaClient, createOpenClawPlugin) are importable from the published tarball.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>" >&2
  echo "Example: $0 0.1.0-alpha.1" >&2
  exit 1
fi

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMOKE_DIR="$(mktemp -d)"
trap 'rm -rf "$SMOKE_DIR"' EXIT

echo "==> Smoke-testing @oda-agent/core@$VERSION and @oda-agent/openclaw-plugin@$VERSION"
echo "    Temp directory: $SMOKE_DIR"

# Create a minimal standalone package.json that uses the real npm version,
# not the workspace '*' reference.
cat > "$SMOKE_DIR/package.json" <<EOF
{
  "name": "smoke-test",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "@oda-agent/core": "$VERSION",
    "@oda-agent/openclaw-plugin": "$VERSION"
  }
}
EOF

cp "$SCRIPT_DIR/verify-imports.cjs" "$SMOKE_DIR/"

cd "$SMOKE_DIR"

echo "==> Running npm install from registry..."
npm install --prefer-online --ignore-scripts --no-audit --no-fund --registry https://registry.npmjs.org

echo "==> Verifying imports..."
node verify-imports.cjs

echo "==> Smoke test passed for version $VERSION ✓"
