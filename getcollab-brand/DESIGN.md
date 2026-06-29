# GetCollab Brand App — Design System & UI Rules

This is the source of truth for all visual decisions in the brand app.
Every screen, component, and animation must follow these rules without exception.

---

## 1. Philosophy

**Dark-first. Premium minimalism. Vercel/Linear aesthetic.**

- Surfaces are pure dark — hierarchy is conveyed through surface lightness, not shadows
- Zero drop shadows. Use `borderWidth: 1` and surface layering instead
- No glassmorphism. Flat + solid surfaces only
- Dense, information-rich layouts — no wasted whitespace
- Animations are entrance-only (FadeIn/FadeInDown), never decorative loops
- Every interactive element must have a visible `pressed` state

---

## 2. Color Tokens

Import from `src/theme.ts` (create if it doesn't exist yet — see Section 9).

```ts
// Surfaces (darkest → lightest)
bg:           '#0A0A0A'   // page background
card:         '#111111'   // card / list background
elevated:     '#171717'   // elevated surface (icon containers, inputs)

// Borders
border:       '#262626'   // default 1px dividers, card borders, input borders
borderStrong: '#3F3F46'   // stronger dividers (button outlines)

// Text
text:         '#FFFFFF'   // primary text
textMuted:    '#A1A1AA'   // secondary labels, metadata
textSubtle:   '#71717A'   // tertiary (timestamps, placeholders, dots)

// Brand — Electric Blue (primary action, AI accents, verified marks)
blue:         '#3B82F6'
blueDeep:     '#1E3A8A'
blueSoft:     'rgba(59,130,246,0.12)'

// Brand — Neon Yellow (primary CTA buttons, active states, logo)
neon:         '#D9FF00'
neonSoft:     'rgba(217,255,0,0.15)'

black:        '#000000'

// Status
success:      '#22C55E'
warning:      '#F59E0B'
error:        '#EF4444'
successSoft:  'rgba(34,197,94,0.14)'
warningSoft:  'rgba(245,158,11,0.14)'
errorSoft:    'rgba(239,68,68,0.14)'
```

**Campaign / bid status colors:**

| Status    | fg        | bg (soft)                      | dot       |
|-----------|-----------|--------------------------------|-----------|
| Live      | #22C55E   | rgba(34,197,94,0.12)           | #22C55E   |
| Review    | #F59E0B   | rgba(245,158,11,0.14)          | #F59E0B   |
| Draft     | #A1A1AA   | rgba(161,161,170,0.12)         | #A1A1AA   |
| Completed | #3B82F6   | rgba(59,130,246,0.14)          | #3B82F6   |

**AI match score colors (for creator discovery):**

| Score  | Color      |
|--------|------------|
| ≥ 90   | #22C55E (success) |
| ≥ 80   | #3B82F6 (blue)    |
| < 80   | #F59E0B (warning) |

---

## 3. Spacing — 8pt Grid

```ts
xs:   4    // micro gaps (icon-to-label, dot offsets)
sm:   8    // small gaps (button internal padding, chip gaps)
md:   12   // standard gaps (card internal sections)
lg:   16   // page horizontal padding, content margins
xl:   24   // between sections
xxl:  32   // large section breaks, bottom nav padding
xxxl: 48   // hero spacing, major page padding
```

`paddingHorizontal: spacing.lg` on every full-width page section — never hardcode 16.

---

## 4. Border Radius

```ts
sm:   6    // inputs, small chips, icon containers
md:   12   // cards, category chips, banners
lg:   16   // large cards, profile cards, stats cards
pill: 999  // all buttons (primary/secondary), status badges, match score pills
```

---

## 5. Typography

Font family: **Inter** (already in Expo via `expo-font` or system fallback).

| Size (pt) | fontWeight | letterSpacing | Use |
|-----------|-----------|---------------|-----|
| 40        | 800       | -1.2          | Hero headings (landing) |
| 32        | 700       | -1.0          | Large display numbers |
| 28        | 700       | -0.8          | Screen titles (Discover, Campaigns) |
| 22        | 700       | -0.5          | Card headings, creator names |
| 18        | 700       | -0.3          | Section values, price display |
| 17        | 700       | -0.3          | Section titles |
| 16        | 700/600   | -0.2          | CTA text, card names |
| 15        | 700/600   | 0             | Body bold, campaign names |
| 14        | 500/600   | 0             | Standard body, descriptions |
| 13        | 500       | 0             | Meta text, subtitles |
| 12        | 500/700   | 0 / +0.4      | Labels, captions, eyebrows |
| 11        | 600/700   | +0.3 / +1.4   | Tiny labels, badge text, eyebrows |
| 10        | 600/700   | +0.4 / +1.2   | Ultra-small caps, BADGE LABELS |

All negative letter-spacing on headings (`-0.3` to `-1.2`) is mandatory — it makes text feel premium.

---

## 6. Buttons

### 6.1 Primary CTA — Neon Yellow Gradient
```tsx
// The main action on every screen (Get Started, Send, Invite, etc.)
<Pressable
  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
>
  <LinearGradient
    colors={['#E8FF33', '#D9FF00']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.primaryGradient}
  >
    <Text style={styles.primaryBtnText}>Action Label</Text>
    <Ionicons name="arrow-forward" size={18} color="#000" />
  </LinearGradient>
</Pressable>

primaryBtn: { borderRadius: 999, overflow: 'hidden' }
primaryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 }
primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }
```

### 6.2 Blue Action Button
```tsx
// Secondary actions within cards (Review Matches, View, etc.)
style={({ pressed }) => [styles.blueBtn, pressed && { opacity: 0.85 }]}

blueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#3B82F6', borderRadius: 999, paddingVertical: 12 }
blueBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' }
```

### 6.3 Outlined Button
```tsx
// Ghost actions (View profile, secondary options)
viewBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong }
viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' }
```

### 6.4 Icon Button (Circle)
```tsx
// Back button, filter, more options
iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }
```
pressed state: `{ opacity: 0.75 }` or `{ opacity: 0.7 }`

### 6.5 Toggle Button (Shortlist / Bookmark)
```tsx
// Inactive state
shortlistBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }
// Active state — neon fill
shortlistBtnActive: { backgroundColor: colors.neon, borderColor: colors.neon }
// Icon color: inactive → '#fff', active → '#000'
```

### 6.6 Quick Action Card Button
```tsx
// Grid of action shortcuts (3-column grid)
style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}

actionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start', gap: 10, minHeight: 92 }
actionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }
actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 16 }
```

### 6.7 Filter Chip Button
```tsx
// Category/status filter pills
// Inactive
chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }
chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' }
// Active
chipActive: { backgroundColor: '#fff', borderColor: '#fff' }
chipTextActive: { color: '#000' }
```

### Rules
- **NEVER** use a flat `backgroundColor: colors.primary` button with rounded corners as the primary action — always neon gradient
- **NEVER** use opacity-only for disabled state — use a lower-contrast border + text instead
- Every `Pressable` must have an explicit `pressed` state feedback (`opacity`, `scale`, or both)
- `hitSlop={10}` on all icon buttons

---

## 7. Cards & Surfaces

### 7.1 Standard Card
```ts
card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }
```

### 7.2 AI/Insights Card (Blue Gradient Border)
```ts
aiCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)', borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden' }
// + LinearGradient absoluteFillObject: ['rgba(59,130,246,0.20)', 'rgba(59,130,246,0.02)']
```

### 7.3 List Card (Linear-style grouped list)
```ts
listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' }
listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }
listRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border }
// Last row: NO divider
```

### 7.4 KPI Metric Card
```ts
kpiCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 6 }
kpiLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' }
kpiValue: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.8, marginTop: 2 }
```

### 7.5 Stats Row Card (3-column dividers)
```ts
statsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.lg }
statDivider: { width: 1, height: 28, backgroundColor: colors.border }
// Each stat: flex: 1, alignItems: 'center'
```

---

## 8. Animations

**Library: `react-native-reanimated` v2+ — never use `Animated` from RN core.**

### 8.1 Entrance Animations (apply to every screen on mount)

```tsx
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Immediate fade (logo, hero image, full-screen cards)
<Animated.View entering={FadeIn.duration(400)}>

// Staggered slide-down (lists, cards that appear in sequence)
// Increment delay by 80ms per item, capped at ~400ms total
<Animated.View entering={FadeInDown.delay(80 * index).duration(320)}>

// Single-item section fade-in (AI card, stats card)
<Animated.View entering={FadeInDown.duration(400)}>
<Animated.View entering={FadeInDown.delay(80).duration(360)}>
```

### 8.2 Rules
- Use `FadeInDown` for content that "arrives" from above the fold — cards, sections, lists
- Use `FadeIn` for full-screen or hero elements — images, background overlays, logo
- Duration range: **320ms – 500ms**. Never go below 280ms or above 600ms
- Delay stagger: **80ms increments** for list items
- **No looping animations, no spring physics on entrance, no bounce**
- Pull-to-refresh `tintColor` must always be `colors.neon`

### 8.3 Button Press Animation
```tsx
// Quick action grid cards only:
pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }
// All other pressables:
pressed && { opacity: 0.85 }   // primary/neon
pressed && { opacity: 0.75 }   // icon buttons
pressed && { opacity: 0.7 }    // ghost/text buttons
```

---

## 9. Status Badges & Pills

### Status Badge (campaign status)
```tsx
// Import from src/theme.ts — keys are lowercase to match API values
import { STATUS_COLORS } from '@/src/theme'
// Keys: active | review | draft | completed | paused | cancelled
// Usage: const s = STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft

statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: s.bg }
statusDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: s.dot }
statusText: { fontSize: 11, fontWeight: '700', color: s.fg }
```

### AI Match Score Pill
```tsx
const scoreColor = score >= 90 ? colors.success : score >= 80 ? colors.blue : colors.warning

matchPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: scoreColor + '55' }
scoreDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: scoreColor }
matchScore: { fontSize: 13, fontWeight: '700', color: scoreColor }
matchLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600' }
```

### Delta/Trend Pill (KPI cards)
```tsx
deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4, backgroundColor: trend === 'up' ? colors.successSoft : colors.errorSoft }
deltaText: { fontSize: 11, fontWeight: '700', color: trend === 'up' ? colors.success : colors.error }
// Icon: trending-up (success) or trending-down (error) from Ionicons, size 11
```

### AI Badge (small label inside AI cards)
```tsx
aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59,130,246,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }
aiBadgeText: { color: colors.blue, fontSize: 10, fontWeight: '700', letterSpacing: 1 }
// Icon: sparkles from Ionicons, size 12, color colors.blue
```

---

## 10. Navigation

### Bottom Tab Bar
```ts
tabBar: { backgroundColor: colors.bg, borderTopColor: colors.border, borderTopWidth: 1 }
// iOS height: 88 (includes 28pt safe area)
// Android height: 70

// Active tab
tabBarActiveTintColor: colors.blue
// Active indicator: soft blue pill background + glow dot below icon
activeIndicator: { backgroundColor: colors.blueSoft, borderRadius: 999 }
activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.blue } // centered below icon
```

### Stack Header
- Back button: `iconBtn` style (40×40 circle, border, card bg)
- Icon: `chevron-back`, size 22, color `#fff`
- Title: `{ color: '#fff', fontSize: 15, fontWeight: '700' }`, centered
- Right action: same `iconBtn` style with `ellipsis-horizontal` icon

### Screen Background
Every screen root: `{ flex: 1, backgroundColor: colors.bg }`
Always wrap with `SafeAreaView` + appropriate edges (`['top']` for scrollable screens, `['top', 'bottom']` for fixed layouts).

---

## 11. Inputs & Search

```ts
searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }
searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 }
// Placeholder color: colors.textSubtle
// Leading icon: search, size 18, color colors.textMuted
// Clear button: close-circle, size 18, color colors.textMuted (only when query.length > 0)
```

Form Inputs (auth screens):
```ts
inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: 14 }
// Focused border: borderColor: colors.borderStrong
input: { flex: 1, color: '#fff', fontSize: 14, padding: 0 }
```

---

## 12. Empty States

All empty states follow the same pattern:
```tsx
<View style={styles.empty}>
  <View style={styles.emptyIcon}>
    <Ionicons name="icon-name" size={26} color={colors.textMuted} />
  </View>
  <Text style={styles.emptyTitle}>Short title</Text>
  <Text style={styles.emptySub}>Helpful one-liner.</Text>
</View>

empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm }
emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }
emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm }
emptySub: { color: colors.textMuted, fontSize: 13 }
```

---

## 13. Section Headers

```ts
// Row with title + "View all" / action link
sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }
sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }
sectionLink: { color: colors.blue, fontSize: 13, fontWeight: '600' }
```

---

## 14. Logo

```tsx
// Neon badge mark + text wordmark
<View style={styles.logoWrap}>
  <View style={styles.logoBadge}>
    <View style={styles.logoDot} />
  </View>
  <Text style={styles.logoText}>GetCollab</Text>
</View>

logoWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }
logoBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' }
logoDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#000' }
logoText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }
```

---

## 15. Creator Card (Discover screen)

```tsx
// Full card anatomy
<View style={styles.creatorCard}>
  {/* Top row: avatar + name/handle + match score pill */}
  {/* Stats row: Followers | Engagement | Country in bordered box */}
  {/* Bottom row: price range + [View profile] [Bookmark toggle] */}
</View>

creatorCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }
avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated }
creatorName: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }
creatorHandle: { color: colors.textMuted, fontSize: 12, marginTop: 2 }
// Verified checkmark: checkmark-circle, size 14, color colors.blue
```

---

## 16. Chat Screen

```ts
// Mine (right-aligned, blue bubble)
myBubble: { alignSelf: 'flex-end', backgroundColor: colors.blue, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '78%' }
myText: { color: '#fff', fontSize: 14 }

// Theirs (left-aligned, card bubble)
theirBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '78%' }
theirText: { color: '#fff', fontSize: 14 }

// Timestamp
timestamp: { color: colors.textSubtle, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' }

// Input bar
inputBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border }
sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' }
// Send icon: send, size 18, color '#000'
```

---

## 17. AI Banner (Discover / inline cards)

```ts
aiBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 10, marginBottom: spacing.md }
aiSparkle: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.18)', alignItems: 'center', justifyContent: 'center' }
aiBannerTitle: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 }
aiBannerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 }
aiBannerCta: { backgroundColor: colors.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }
aiBannerCtaText: { color: '#fff', fontSize: 12, fontWeight: '700' }
```

---

## 18. Theme File — `src/theme.ts`

> **Important:** The shared package `@shared/constants` still uses the OLD color system (Linear indigo `#5e6ad2` primary, different backgrounds). Do NOT import colors from `@shared/constants` for any new UI work. Always import from `@/src/theme` instead.
>
> Old screens may still use `colors.primary` (indigo) — replace with `colors.neon` or `colors.blue` based on context when rebuilding those screens.

Create this file at `getcollab-brand/src/theme.ts`:

```ts
export const colors = {
  bg: '#0A0A0A',
  card: '#111111',
  elevated: '#171717',
  border: '#262626',
  borderStrong: '#3F3F46',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  textSubtle: '#71717A',
  blue: '#3B82F6',
  blueDeep: '#1E3A8A',
  blueSoft: 'rgba(59,130,246,0.12)',
  black: '#000000',
  neon: '#D9FF00',
  neonSoft: 'rgba(217,255,0,0.15)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  successSoft: 'rgba(34,197,94,0.14)',
  warningSoft: 'rgba(245,158,11,0.14)',
  errorSoft: 'rgba(239,68,68,0.14)',
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const radius = {
  sm: 6, md: 12, lg: 16, pill: 999,
};

export const typography = {
  family: 'Inter',
  sm: 12, base: 14, md: 16, lg: 18, xl: 24, xxl: 32,
};
```

Import path: `import { colors, spacing, radius } from '@/src/theme'`

---

## 19. Required Packages

All of these must be installed — check `package.json` before adding:

| Package | Use |
|---------|-----|
| `react-native-reanimated` | ALL entrance animations — FadeIn, FadeInDown |
| `expo-linear-gradient` | Primary CTA button, AI insight card background |
| `expo-image` | Creator/influencer avatars (better performance than RN Image) |
| `@expo/vector-icons` (Ionicons) | All icons — never use custom SVGs for icons |
| `react-native-safe-area-context` | SafeAreaView on every screen |
| `@gorhom/bottom-sheet` | Bottom sheets (filter panels, action confirmations) |

---

## 20. What NOT to Do

- No white/light backgrounds anywhere — the app is always dark
- No `shadows` / `elevation` props — use border + surface color instead
- No `React.Animated` from react-native core — use `react-native-reanimated` only
- No generic blue `Button` component with rounded corners as primary CTA
- No plain `#fff` borders — all borders use `colors.border` (#262626) or `colors.borderStrong`
- No color hardcodes — always use the token from `colors.*`
- No `fontFamily: undefined` — always specify `fontWeight` and allow system Inter
- No `marginTop: 0` hacks — use the `spacing.*` tokens
- No screens without `FadeIn` or `FadeInDown` entrance animations on their main content
- No empty `pressed` state on any `Pressable`
