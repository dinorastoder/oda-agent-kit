#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/create-github-issues.sh owner/repo
#
# Requirements:
#   gh auth login
#   gh repo view owner/repo

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: $0 owner/repo" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI ('gh') is not installed or not in PATH." >&2
  echo "Install instructions: https://cli.github.com/" >&2
  echo "Then run: gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: GitHub CLI is not authenticated." >&2
  echo "Run: gh auth login" >&2
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Error: Repository '$REPO' is not accessible with current auth." >&2
  exit 1
fi

LABELS_ENABLED=1

ensure_label() {
  local label="$1"

  if gh label view "$label" --repo "$REPO" >/dev/null 2>&1; then
    return
  fi

  echo "Creating missing label: $label"
  if ! gh label create "$label" --repo "$REPO" --color "0E8A16" >/dev/null 2>&1; then
    LABELS_ENABLED=0
    echo "Warning: Could not create label '$label' (insufficient permissions)." >&2
    echo "Warning: Continuing without labels for issue creation." >&2
  fi
}

ensure_required_labels() {
  local labels=(
    copilot
    setup
    monorepo
    core
    cli
    mcp
    openclaw
    analysis
    cart
    docs
    ci
    release
  )

  for label in "${labels[@]}"; do
    if [[ "$LABELS_ENABLED" -eq 0 ]]; then
      break
    fi
    ensure_label "$label"
  done
}

filter_existing_labels() {
  local csv="$1"
  local filtered=()
  local label

  IFS=',' read -r -a raw_labels <<< "$csv"
  for label in "${raw_labels[@]}"; do
    if gh label view "$label" --repo "$REPO" >/dev/null 2>&1; then
      filtered+=("$label")
    fi
  done

  if [[ ${#filtered[@]} -eq 0 ]]; then
    echo ""
    return
  fi

  local joined
  joined=$(IFS=,; echo "${filtered[*]}")
  echo "$joined"
}

create_issue() {
  local title="$1"
  local labels="$2"
  local body_file="$3"
  local effective_labels="$labels"

  echo "Creating issue: $title"

  if [[ "$LABELS_ENABLED" -eq 0 ]]; then
    effective_labels=""
  else
    effective_labels=$(filter_existing_labels "$labels")
  fi

  if [[ -n "$effective_labels" ]]; then
    gh issue create \
      --repo "$REPO" \
      --title "$title" \
      --label "$effective_labels" \
      --body-file "$body_file"
  else
    gh issue create \
      --repo "$REPO" \
      --title "$title" \
      --body-file "$body_file"
  fi
}

  ensure_required_labels

create_issue "Bootstrap TypeScript npm workspace monorepo" "copilot,setup,monorepo" "docs/github-issues/001-bootstrap-monorepo.md"
create_issue "Create core package types and Oda client skeleton" "copilot,core" "docs/github-issues/002-core-types-client.md"
create_issue "Add basic CLI commands" "copilot,cli" "docs/github-issues/003-cli-basic-commands.md"
create_issue "Create MCP server with read-only tool skeleton" "copilot,mcp" "docs/github-issues/004-mcp-readonly-server.md"
create_issue "Create OpenClaw plugin skeleton and skill" "copilot,openclaw" "docs/github-issues/005-openclaw-plugin-skeleton.md"
create_issue "Implement order history normalization and staple analysis" "copilot,core,analysis" "docs/github-issues/006-order-history-preferences.md"
create_issue "Implement cart planning before mutation" "copilot,core,cart" "docs/github-issues/007-cart-planning.md"
create_issue "Document safety model and tool contracts" "copilot,docs" "docs/github-issues/008-docs-safety-tool-contracts.md"
create_issue "Add GitHub Actions CI for build and tests" "copilot,ci" "docs/github-issues/009-ci-build-test.md"
create_issue "Add npm publishing plan for workspace packages" "copilot,release,docs" "docs/github-issues/010-publishing-plan.md"

echo "Done."
