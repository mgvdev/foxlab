# AGENT.md

## Project Overview
- Name: `foxlab`
- Type: desktop app with Tauri v2 + React + TypeScript (Vite)
- Frontend: `src/`
- Rust/Tauri backend: `src-tauri/`

## Current State
- The repository is currently very close to the default Tauri template.
- Main Rust command exposed to the frontend: `greet` in `src-tauri/src/lib.rs`.
- Main React entry point: `src/App.tsx`.

## Tech Stack
- Runtime/package manager expected by Tauri config: `bun`
- Frontend tooling: Vite 7, TypeScript 5, React 19
- Tauri: `@tauri-apps/*` v2 + Rust crate `tauri` v2

## Runbook
- Install JS deps:
  - `bun install`
- Run frontend only:
  - `bun run dev`
- Run Tauri app in development:
  - `bun run tauri dev`
- Build frontend:
  - `bun run build`
- Build desktop app:
  - `bun run tauri build`

## Important Config Notes
- `src-tauri/tauri.conf.json` uses:
  - `beforeDevCommand: bun run dev`
  - `beforeBuildCommand: bun run build`
  - `devUrl: http://localhost:1420`
- Keep frontend dev server aligned with port `1420` unless you also update Tauri config.

## Repository Structure
- `src/main.tsx`: React bootstrap
- `src/App.tsx`: current UI and Tauri invoke example
- `src/App.css`: base styles
- `src-tauri/src/lib.rs`: Tauri command registration and app builder
- `src-tauri/src/main.rs`: binary entry point
- `src-tauri/tauri.conf.json`: app/build/bundle configuration

## Development Guidelines for Agents
- Prefer minimal, focused changes; this project is currently a clean template.
- When adding a Rust command:
  1. Implement with `#[tauri::command]` in `src-tauri/src/lib.rs` (or a module imported there).
  2. Register it in `tauri::generate_handler![...]`.
  3. Invoke it from the frontend with `invoke("command_name", payload)`.
- Preserve TypeScript strictness and avoid `any` unless justified.
- Do not change build commands (`bun`) without updating `src-tauri/tauri.conf.json` and documenting why.
- After each completed task, create a Git commit.
- Commit messages must follow the Conventional Commits format (e.g. `feat: ...`, `fix: ...`, `chore: ...`).

## Validation Checklist
- Frontend compiles: `bun run build`
- Tauri dev startup works: `bun run tauri dev`
- If Rust code changes, ensure it compiles during Tauri run/build.
