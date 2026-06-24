# Contributing Guide

## Branching

| Branch | Purpose |
|---|---|
| `master` | Production-ready code |
| `dev` | Integration branch — all PRs target this |
| `feature/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, deps, config |

Always branch off `dev`, never off `master`.

```bash
git checkout dev
git pull origin dev
git checkout -b feature/brand-affiliate-dashboard
```

## Where to Put New Code

### Adding a feature only for Brand
Put it in `getcollab-brand/src/`. Import shared utilities via `@shared/*`.

### Adding a feature only for Influencer
Put it in `getcollab-influencer/src/`. Import shared utilities via `@shared/*`.

### Adding something both apps need
Add it to `packages/mobile-shared/src/` and export it from the relevant barrel (`stores/index.ts`, `components/ui/index.ts`, etc.).

### Rule of thumb
> If you find yourself writing the same code in both apps — it belongs in `mobile-shared`.

## Adding a New Screen

1. Create the screen file in the correct app:
   ```
   getcollab-brand/src/app/(main)/brand/my-new-screen/index.tsx
   ```

2. Register it in the app's navigator:
   ```ts
   // getcollab-brand/src/navigation/MainTabs.tsx
   import MyNewScreen from '../app/(main)/brand/my-new-screen'
   // add <Stack.Screen name="MyNewScreen" component={MyNewScreen} ... />
   ```

3. Import shared code using the `@shared` alias — never via relative paths that cross the package boundary:
   ```ts
   // ✅
   import { useAuthStore } from '@shared/stores/auth-store'
   import { Button } from '@shared/components/ui'

   // ❌ — fragile relative path across packages
   import { useAuthStore } from '../../../../packages/mobile-shared/src/stores/auth-store'
   ```

## Adding a New Shared Store

1. Create the store in `packages/mobile-shared/src/stores/`:
   ```ts
   // packages/mobile-shared/src/stores/my-store.ts
   import { create } from 'zustand'
   import apiService from '../services/api'
   ```

2. Export it from the barrel:
   ```ts
   // packages/mobile-shared/src/stores/index.ts
   export { useMyStore } from './my-store'
   ```

3. Re-export from each app's local barrel if needed:
   ```ts
   // getcollab-brand/src/stores/index.ts
   export { useMyStore } from '@shared/stores/my-store'
   ```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(brand): add affiliate dashboard screen
fix(shared): correct token refresh race condition
chore: upgrade expo to 54.1
```

Scope options: `brand`, `influencer`, `shared`, or omit for repo-wide changes.

## Pull Requests

- Target branch: `dev`
- Title format: `feat(brand): short description`
- Keep PRs focused — one concern per PR
- Run before opening:
  ```bash
  pnpm --filter getcollab-brand tsc --noEmit
  pnpm --filter getcollab-influencer tsc --noEmit
  pnpm test
  ```

## Adding Dependencies

```bash
# Dependency used by one app only
pnpm --filter getcollab-brand add some-package

# Dependency used by the shared package
pnpm --filter @getcollab/mobile-shared add some-package

# Dev dependency at the root
pnpm add -Dw some-dev-tool
```

Do not add a dependency to both apps separately if it belongs in `mobile-shared`.
