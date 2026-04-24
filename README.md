# Oda Agent Kit

A TypeScript npm workspace monorepo for building reusable automation tools around Oda grocery shopping.

## Packages

| Package | Description |
|---------|-------------|
| [`@oda-agent/core`](./packages/core) | Oda API client, types, and authentication helpers |
| [`@oda-agent/cli`](./packages/cli) | CLI tool for interacting with Oda from the terminal |
| [`@oda-agent/mcp-server`](./packages/mcp-server) | MCP server exposing Oda operations as AI tools |
| [`@oda-agent/openclaw-plugin`](./packages/openclaw-plugin) | OpenClaw plugin for safe grocery planning and automation |

## Features

- 🛒 **Grocery planning** — search products, manage shopping lists
- 📦 **Order history** — analyse past orders and spending
- 🛍️ **Cart preparation** — build and manage your cart programmatically
- 🚚 **Delivery slot assistance** — find and book available delivery slots
- 🤖 **AI integration** — MCP server and OpenClaw plugin for LLM-driven workflows

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
npm install
npm run build
```

### Configuration

Copy `.env.example` to `.env` and fill in your Oda credentials:

```bash
cp .env.example .env
```

### Usage

#### CLI

```bash
npx @oda-agent/cli --help
```

#### MCP Server

```bash
npx @oda-agent/mcp-server
```

## Development

### Build all packages

```bash
npm run build
```

### Run tests

```bash
npm run test
```

### Type-check

```bash
npm run typecheck
```

### Clean build artifacts

```bash
npm run clean
```

## Repository Structure

```text
oda-agent-kit/
├── packages/
│   ├── core/               # @oda-agent/core
│   ├── cli/                # @oda-agent/cli
│   ├── mcp-server/         # @oda-agent/mcp-server
│   └── openclaw-plugin/    # @oda-agent/openclaw-plugin
├── docs/                   # Documentation
├── scripts/                # Development and CI scripts
├── tsconfig.base.json      # Shared TypeScript config
├── package.json            # Workspace root
└── .env.example            # Environment variable template
```

## Contributing

See [AGENTS.md](./AGENTS.md) for contributor and agent guidelines.

## License

MIT
