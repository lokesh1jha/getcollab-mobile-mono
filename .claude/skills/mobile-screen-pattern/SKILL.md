---
name: mobile-screen-pattern
description: Screen conventions for both React Native apps — theme tokens, the screen skeleton, loading/empty/list states, Pressable and reanimated rules. Load before creating or editing any screen or component in getcollab-brand or getcollab-influencer.
---

# Mobile screen pattern

Both apps share one premium dark design language. **Read
[getcollab-brand/DESIGN.md](../../../getcollab-brand/DESIGN.md) for the full component spec before
touching UI** — this skill is the working checklist, that file is the source of truth.

## Non-negotiables

1. Import tokens from `@/src/theme` — **never** from `@shared/constants` (that's the old indigo
   system, kept only for legacy code).
2. Use `Pressable`, not `TouchableOpacity`.
3. Use `react-native-reanimated`, not `Animated` from react-native core.
4. Every new screen gets an entrance animation.
5. Every `Pressable` needs a visible pressed state (`opacity: 0.85` minimum).

## Core tokens

| Token | Brand | Influencer | Use |
|---|---|---|---|
| `colors.bg` | `#0A0A0A` | `#000000` | Page background |
| `colors.card` | `#111111` | `#0F0F0F` | Card surface |
| `colors.neon` | `#D9FF00` | Primary CTA, active states, logo accent |
| `colors.blue` | `#3B82F6` | Secondary actions, AI features, links |
| `colors.text` | `#FFFFFF` | Primary text |
| `colors.textMuted` | `#A8A8A8` | Secondary labels |
| `colors.border` | `#262626` | All 1px borders |

Also exported from `theme.ts`: `spacing`, `radius`, `typography`, `STATUS_COLORS`, `statusColor()`.

Primary CTA = `backgroundColor: colors.neon` with dark text.

## Screen skeleton

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

Stagger list entrances with `FadeInDown.delay(80 * i).duration(320)`.

## Loading state

```tsx
<View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
  <ActivityIndicator size="large" color={colors.neon} />
</View>
```

## Empty state

Circular muted icon chip (56px, `colors.card` + 1px `colors.border`), bold title, muted subtitle,
centred with `paddingVertical: 48, gap: 8`.

## List card (Linear-style grouped list)

One rounded card (`radius` 16, `overflow: 'hidden'`) wrapping rows; separators are
`borderBottomWidth: 1` on every row **except the last**:

```tsx
style={[{ flexDirection: 'row', padding: 16 }, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
```

## Status colours

`STATUS_COLORS` keys are **lowercase**, matching API values (`active`, `applied`, `accepted`,
`completed`, `rejected`, `cancelled`, `pending`, `draft`, `paused`). Always fall back:

```tsx
const s = STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft
```
