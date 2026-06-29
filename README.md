# GetCollab Mobile Monorepo

Two native mobile apps — one for **Brands**, one for **Creators** — sharing a common foundation.

```
getcollab-mobile-mono/
├── packages/
│   └── mobile-shared/       # @getcollab/mobile-shared
│       ├── src/services/    # API client, logger, notifications, observability
│       ├── src/stores/      # Auth, campaign, chat, influencer, notifications, settings
│       ├── src/components/  # UI kit (Button, Card, Input …) + shared banners
│       ├── src/types/       # All TypeScript interfaces
│       ├── src/constants/   # Colors, spacing, tokens, categories
│       └── src/screens/     # MaintenanceScreen
│
├── getcollab-brand/         # "GetCollab Brands" — in.getcollab.brand
│   └── src/
│       ├── app/(main)/brand/        # Campaigns, creators, bids, analytics, invite
│       ├── app/(main)/subscription/ # Subscription & billing management
│       ├── components/              # SubscriptionBanner, TrialGuard, SubscriptionExpiredModal
│       ├── hooks/useTrialGuard.ts
│       ├── navigation/MainTabs.tsx  # Brand-only tab navigator
│       └── stores/subscription-store.ts
│
└── getcollab-influencer/    # "GetCollab Creators" — in.getcollab.creator
    └── src/
        ├── app/(main)/influencer/   # Discover, campaigns, chat, profile
        ├── app/(main)/earnings/     # Payout history
        ├── components/PortfolioGallery.tsx
        └── navigation/MainTabs.tsx  # Influencer-only tab navigator
```

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.81 + Expo 54 |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| State | Zustand 5 |
| Real-time | Socket.IO client |
| Notifications | Expo Notifications |
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9 |

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode 15+ / Android: Android Studio + JDK 17

## Getting Started

```bash
# 1. Clone
git clone https://github.com/lokesh1jha/getcollab-mobile-mono.git
cd getcollab-mobile-mono

# 2. Install all dependencies
pnpm install

# 3. Set environment variables
cp getcollab-brand/.env.example getcollab-brand/.env
cp getcollab-influencer/.env.example getcollab-influencer/.env
# Edit both .env files and set EXPO_PUBLIC_API_URL
```

## Running the Apps

> **Note:** Both apps use custom native modules (Reanimated, Notifications, Secure Store) that don't work in Expo Go. You must use a dev build (`run:ios` / `run:android`). The first build takes a few minutes; subsequent starts only need Metro.

**From the monorepo root (recommended):**

```bash
# Brand app
pnpm brand             # start Metro bundler (after a build exists)
pnpm brand:ios         # build + run on iOS simulator
pnpm brand:android     # build + run on Android emulator

# Influencer app
pnpm influencer        # start Metro bundler
pnpm influencer:ios    # build + run on iOS simulator
pnpm influencer:android
```

**Or with npx from inside each app folder:**

```bash
cd getcollab-brand
npx expo run:ios       # first time — full native build + launch
npx expo run:android
npx expo start         # subsequent starts — just Metro
```

## Shared Code (`@shared/*`)

All shared code lives in `packages/mobile-shared`. Both apps import from it using the `@shared` path alias — no npm publish required.

```ts
import { useAuthStore } from '@shared/stores/auth-store'
import { colors } from '@shared/constants'
import { Button } from '@shared/components/ui'
```

The alias is configured in two places per app:

- **tsconfig.json** — `"@shared/*": ["../packages/mobile-shared/src/*"]`
- **metro.config.js** — `watchFolders` + `resolver.extraNodeModules`

## Running Tests

```bash
pnpm test                        # all packages
pnpm --filter getcollab-brand test
pnpm --filter getcollab-influencer test
```
