# GetCollab Mobile Monorepo

AI-powered influencer marketing platform with two React Native apps sharing a common package.

## Repo Layout

```
getcollab-mobile-mono/
├── getcollab-brand/         # Brand app — for businesses running campaigns
├── getcollab-influencer/    # Creator app — for influencers finding campaigns
├── packages/
│   └── mobile-shared/       # Shared stores, services, components, types
└── pnpm-workspace.yaml      # pnpm workspaces root
```

**Import alias:** `@shared/*` → `packages/mobile-shared/src/*`, `@/*` → app root (brand or influencer). Both apps have metro.config.js and tsconfig.json wired for these.

## Running the Apps

```bash
# Brand app
pnpm brand               # start Metro
pnpm brand:ios           # build + run iOS simulator

# Influencer/Creator app
pnpm influencer          # start Metro
pnpm influencer:ios      # build + run iOS simulator
```

Both apps require `npx expo run:ios` (dev build) — they use custom native modules (reanimated, notifications, secure store) that don't work in Expo Go.

## Design System

Both apps use the same premium dark design language. **Always read the design doc before touching UI.**

- Brand app: [getcollab-brand/DESIGN.md](getcollab-brand/DESIGN.md)
- Influencer app mirrors brand patterns with creator-specific tokens in [getcollab-influencer/src/theme.ts](getcollab-influencer/src/theme.ts)

### Core tokens (both apps)

| Token | Value | Use |
|---|---|---|
| `colors.bg` | `#000000` (influencer) / `#0A0A0A` (brand) | Page background |
| `colors.card` | `#0F0F0F` / `#111111` | Card surface |
| `colors.neon` | `#D9FF00` | Primary CTA buttons, active states, logo accent |
| `colors.blue` | `#3B82F6` | Secondary actions, AI features, links |
| `colors.text` | `#FFFFFF` | Primary text |
| `colors.textMuted` | `#A8A8A8` | Secondary labels |
| `colors.border` | `#262626` | All 1px borders |

**Never import from `@shared/constants`** for new UI work — that file has the old indigo color system. Always use `@/src/theme`.

### Button rule
Primary CTA = `backgroundColor: colors.neon`, `borderRadius: 999`, `paddingVertical: 18`, black text. No exceptions.

### Animation rule
All screens use `react-native-reanimated` (not RN's `Animated`). Entrance: `FadeIn` for heroes, `FadeInDown.delay(80*i).duration(320)` for lists.

## Shared Package (`@shared/*`)

The shared package provides everything both apps need without duplication:

| Path | What it provides |
|---|---|
| `@shared/stores/auth-store` | `useAuthStore` — sign in, sign up, sign out, `user` |
| `@shared/stores/chat-store` | `useChatStore` — rooms, messages, send, socket |
| `@shared/stores/campaign-store` | `useCampaignStore` — campaigns CRUD |
| `@shared/stores/influencer-store` | `useInfluencerStore` — influencer list |
| `@shared/stores/notification-store` | `useNotificationStore` — notifications, `markAsRead`, `markAllAsRead` |
| `@shared/services/api` | `apiService` singleton — all HTTP calls + `handleApiError` |
| `@shared/services/logger` | Observability logging |
| `@shared/types` | `User`, `Message`, `ChatRoom`, `Campaign`, `Subscription`, etc. |
| `@shared/components/ui` | `Button`, `Card`, `Input`, `Modal` (old design — avoid for new screens) |
| `@shared/components/EmailVerificationBanner` | Show at top of main screens when email unverified |

## Key API Methods (apiService)

```ts
// Auth
apiService.signin({ email, password })
apiService.signup({ name, email, password, role })
apiService.getCurrentUser()

// Campaigns
apiService.getCampaigns(params?)       // discover
apiService.getMyCampaigns()            // brand's own campaigns
apiService.getBids(params?)            // influencer's bids
apiService.submitBid({ campaignId, amount, message })

// Profile
apiService.getProfile()
apiService.getProfileWithMetrics()
apiService.updateProfile(updates)

// Earnings
apiService.getEarnings()
apiService.requestPayout({ amount, message, campaignId? })

// Chat
// Handled via chat-store — use fetchRooms(), sendMessage(), etc.

// Notifications
apiService.getNotifications()
```

## Status Colors

Both apps define `STATUS_COLORS` in their `src/theme.ts` with **lowercase keys** matching API values: `active`, `applied`, `accepted`, `completed`, `rejected`, `cancelled`, `pending`, `draft`, `paused`.

```ts
// Usage
import { statusColor } from '@/src/theme'  // influencer
// or
import { STATUS_COLORS } from '@/src/theme'  // brand
const s = STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft
```

## Navigation

### Brand app
React Navigation native stack. Auth screens (`Landing`, `SignIn`, `SignUp`) → `Main` (tab navigator with 5 tabs). All auth screens have `headerShown: false` — they manage their own headers.

### Influencer app
Same pattern. Tabs: `Dashboard`, `Discover`, `MyCampaigns`, `Chat`, `Profile`. Tab bar has no labels (icon-only, Instagram-style). Neon active dot below icon.

### Stack screen names (influencer)
`CampaignDetails`, `ChatDetail`, `Earnings`, `Disputes`, `Settings`, `Notifications`, `VerifyEmail`, `ChangePassword`, `Onboarding`, `ProfilePreview`

## Common Patterns

### Screen skeleton
```tsx
import { colors, spacing, radius } from '@/src/theme'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function MyScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* content */}
      </SafeAreaView>
    </View>
  )
}
```

### Loading state
```tsx
if (loading) return (
  <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={colors.neon} />
  </View>
)
```

### Empty state
```tsx
<View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="icon-name" size={26} color={colors.textMuted} />
  </View>
  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Title</Text>
  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Subtitle</Text>
</View>
```

### List card (Linear-style grouped list)
```tsx
<View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' }}>
  {items.map((item, i) => (
    <View key={item.id} style={[{ flexDirection: 'row', padding: 16 }, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {/* row content */}
    </View>
  ))}
</View>
```

## Before Writing Any Code

1. Check `DESIGN.md` in the brand app for the full component spec
2. Import colors from `@/src/theme`, never `@shared/constants`
3. Use `Pressable` not `TouchableOpacity`
4. Use `react-native-reanimated` not `Animated` from react-native core
5. All new screens need entrance animations
6. Every `Pressable` must have a visible pressed state (`opacity: 0.85` minimum)

## E2E Tests (Maestro)

Both apps have `.maestro/` with YAML flow files for auth, campaigns, chat, subscriptions. Run with the Maestro CLI after a dev build.

## Environment

Both apps read `EXPO_PUBLIC_API_URL` from `.env`. Example: `EXPO_PUBLIC_API_URL=https://api.getcollab.in/api/v1`
