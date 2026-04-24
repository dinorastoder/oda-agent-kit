#!/usr/bin/env bash
# scripts/build.sh — build all workspace packages in dependency order
set -euo pipefail

echo "Building @oda-agent/core..."
npm run build --workspace=packages/core

echo "Building @oda-agent/cli..."
npm run build --workspace=packages/cli

echo "Building @oda-agent/mcp-server..."
npm run build --workspace=packages/mcp-server

echo "Building @oda-agent/openclaw-plugin..."
npm run build --workspace=packages/openclaw-plugin

echo "All packages built successfully."
