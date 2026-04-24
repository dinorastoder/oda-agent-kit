# Add GitHub Actions CI for build and tests

Labels: copilot, ci

## Goal

Add basic GitHub Actions workflow for install, build, typecheck, and tests.

## Scope

Create `.github/workflows/ci.yml`.

## Acceptance criteria

- [ ] CI runs on pull requests
- [ ] CI runs on pushes to main
- [ ] CI installs dependencies with `npm ci`
- [ ] CI runs build
- [ ] CI runs tests
- [ ] CI runs lint/typecheck if scripts exist

