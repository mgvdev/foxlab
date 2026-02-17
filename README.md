# Foxlab — GitLab Menubar Companion

Application Tauri (macOS) orientée barre de menu pour suivre rapidement:
- les Merge Requests assignées / en review,
- les commentaires récents sur ces MRs,
- les nouveaux commentaires via notifications.

## Stack
- Tauri v2 (Rust)
- React 19 + TypeScript + Vite
- HeroUI v3 beta
- Tailwind CSS v4

## Prérequis
- Bun
- Rust toolchain
- Xcode Command Line Tools (macOS)

## Lancer en local
```bash
bun install
bun run tauri dev
```

## Build
```bash
bun run build
bun run tauri build
```

## Configuration dans l'app
Ouvre `Réglages` puis renseigne:
- `GitLab base URL` (`https://gitlab.com` ou self-host)
- `Personal Access Token`
- intervalle de sync (1/2/3/5 min, défaut 2)

Le token et l'état local (`last seen`, `last notified`) sont persistés via `tauri-plugin-store`.

## Fonctionnalités MVP
- Icône tray + fenêtre compacte type popover
- Tabs `Commentaires` / `MRs`
- Refresh manuel + polling automatique
- Notifications macOS sur nouveaux commentaires
- Ouverture des items GitLab dans le navigateur
- États `loading`, `empty`, `error`

## Limites MVP
- TLS strict uniquement (pas de mode certif invalide)
- Pas de mode offline avancé
- Notifications envoyées pour tout nouveau commentaire (hors auteur courant)
