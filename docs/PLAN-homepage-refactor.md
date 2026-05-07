# PLAN: VietTune Homepage Visual Refactor

**Slug:** `homepage-refactor`
**File:** `docs/PLAN-homepage-refactor.md`
**Created:** 2026-04-29
**Project Type:** WEB
**Agent:** `frontend-specialist`
**Skills:** `frontend-design`, `clean-code`, `tailwind-patterns`

---

## 📋 Overview

Refactor the VietTune `HomePage.tsx` (and lightly `Footer.tsx`) to match the **approved final landing layout** without touching any routing, auth, search logic, or service calls.

The goal is a **production-ready minimal diff** that makes the homepage:
- Cleaner and centered with a single hero card
- Visually consistent with the VietTune brand (red + gold + cream)
- Mobile-responsive by default
- Quote separator block + footer improvements included

---

## ✅ Success Criteria

| # | Criterion | Verifiable? |
|---|-----------|-------------|
| 1 | Hero card is centered, ≈1040px wide, white/cream bg with soft shadow | ✅ Visual |
| 2 | Inside hero card: logo → subtitle → title → headline → description → search bar → 3 feature cards | ✅ DOM order |
| 3 | Search bar: rounded-xl, input left, yellow button right, correct placeholder | ✅ Visual |
| 4 | 3 feature shortcut cards (equal width/height, icon top-left, bold title, muted subtitle) | ✅ DOM count |
| 5 | Quote separator below hero card (italic, centered, muted, lotus ornament) | ✅ Visual |
| 6 | Footer: wider breathing room, same structure, max-width aligned to hero card | ✅ Visual |
| 7 | Background: cream + left bronze drum + right lotus, subtle opacity — unchanged | ✅ Visual |
| 8 | Zero routing / auth / search logic changes | ✅ Diff review |
| 9 | No TypeScript errors: `npx tsc --noEmit` passes | ✅ Script |
| 10 | No lint errors: `npm run lint` passes | ✅ Script |

---

## 🧱 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI Framework | React + TypeScript | Strict mode, no `any` |
| Styling | Tailwind CSS v3 + custom tokens | Reuse existing `primary-*`, `secondary-*`, `cream-*`, `surface-panel` |
| Icons | Lucide React | Already installed, use `Music`, `Upload`, `BookOpen` for feature cards |
| Routing | React Router v6 | DO NOT change — only `<Link to=...>` usage |
| State | useState / useRef / useCallback | Pre-existing hooks stay intact |
| Logo | `@/components/image/VietTune logo.png` | Reuse |

---

## 📂 Files to Touch

| File | Change Type | Notes |
|------|------------|-------|
| `src/pages/HomePage.tsx` | **Primary edit** | Visual layout refactor — all logic stays |
| `src/components/layout/Footer.tsx` | **Minor edit** | Wider padding, centered container |
| `src/index.css` | **Possible minor** | Only if a new utility class is needed (unlikely) |

**Files to NOT touch:**
- `MainLayout.tsx` — routing/auth logic
- `Header.tsx` — navigation logic
- `ExploreSearchHeader.tsx` — search component (reuse as-is)
- `surfaceTokens.ts` — read-only
- Any `services/`, `stores/`, `hooks/`, `api/`, `types/` files

---

## 📂 File Structure (Unchanged)

```
src/
├── pages/
│   └── HomePage.tsx          ← PRIMARY TARGET
├── components/
│   └── layout/
│       └── Footer.tsx        ← MINOR TARGET
└── index.css                 ← POSSIBLE MINOR
```

---

## 📐 PHASE 3: SOLUTIONING (Architecture & Design)

### Layout Architecture

```
<main>                                      ← MainLayout provides this
  <div.page-wrapper>                        ← min-h-screen, bg-transparent
    <div.max-width-container>               ← max-w-[1200px] mx-auto px-4

      <!-- HERO CARD -->
      <section.hero-card>                   ← bg-surface-panel, rounded-2xl, shadow-lg, border
                                            ← max-w-[1040px] mx-auto, px-10 py-14
        <img logo />
        <p.subtitle />                      ← tracking-widest uppercase text-primary-600/80
        <h1>VietTune</h1>
        <p.headline />                      ← text-2xl font-semibold text-primary-700
        <p.description />

        <!-- SEARCH BAR -->
        <div.search-container>             ← rounded-xl border bg-white shadow-sm overflow-hidden
          <ExploreSearchHeader ... />       ← reuse existing component unchanged
        </div>

        <!-- FEATURE CARDS ROW -->
        <div.feature-grid>                 ← grid grid-cols-3 gap-4 mt-6
          <FeatureCard /> x 3              ← inline (not extracted) — only 3 usages
        </div>

      </section>

      <!-- QUOTE SEPARATOR -->
      <section.quote>                      ← text-center py-10 sm:py-12 (tighter — keep footer closer)
        <p.quote-text />                   ← italic text-neutral-500
        <span.lotus-ornament />            ← unicode lotus, text-primary-400
      </section>

    </div>

    <!-- GATEWAY MODAL — MUST remain here, outside max-width container -->
    <!-- DO NOT move modal inside hero card or max-width-container DOM tree -->
    {isGatewayModalOpen && <GatewayModal />}

  </div>
</main>
```

### Feature Card Design (Inline, No New Component File)

```tsx
// Defined as a small const inside HomePage.tsx - NOT a separate file
const FEATURE_CARDS = [
  { icon: Music,    title: 'Khám phá bản thu', subtitle: 'Nghe và tìm kiếm bản ghi', to: '/explore' },
  { icon: Upload,   title: 'Đóng góp bản thu',  subtitle: 'Chia sẻ di sản của bạn',   to: '/upload'  },
  { icon: BookOpen, title: 'Tra cứu tri thức',  subtitle: 'Khám phá kho tri thức',     to: '/chatbot' },
];
```

Cards (base): `group bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm transition-all duration-200`

Cards (hover states — group-hover enabled):
- Container: `hover:shadow-md hover:-translate-y-0.5 hover:border-secondary-300/70 hover:bg-cream-50/60`
- Icon wrapper: `group-hover:scale-110 group-hover:text-primary-600 transition-transform duration-200`
- Title: `group-hover:text-primary-700 transition-colors duration-150`
- Subtitle: `text-neutral-500` (static muted, no hover change needed)

### Search Bar Integration Strategy

> **DO NOT** replace `ExploreSearchHeader`. Wrap it in a styled container div.

```tsx
<div className="mt-8 rounded-xl border border-neutral-200/70 shadow-sm overflow-hidden">
  <ExploreSearchHeader
    layout="home-semantic-only"
    ...   // all existing props unchanged
  />
</div>
```

### Footer Changes (Minimal)

Current padding: `px-8 py-12` → New: `px-10 sm:px-16 py-14`
Wrap inner grid in `max-w-[960px] mx-auto` to align with hero card.

### Color Tokens Reference

| Use | Token |
|-----|-------|
| Hero card background | `bg-surface-panel` (#FFFCF5) |
| Hero card border | `border border-secondary-200/50` |
| Hero card shadow | `shadow-lg` |
| Subtitle text | `text-primary-600/80` |
| Search button | `bg-secondary-400 hover:bg-secondary-500 text-white` |
| Feature card hover | `hover:shadow-md hover:-translate-y-0.5` |
| Quote text | `text-neutral-500 italic` |
| Lotus ornament | `text-primary-400` |

---

## 📋 PHASE 4: TASK BREAKDOWN

### Task 1 — Refactor HomePage Hero Section

**Agent:** `frontend-specialist`
**Priority:** P0 (blocker for Task 2)

```
INPUT:
  - src/pages/HomePage.tsx (current: max-w-7xl, exploreLikePanel hero block)

OUTPUT:
  - Centered hero card: max-w-[1040px] mx-auto  ← wider for search + feature card breathing room
  - Card: bg-surface-panel rounded-2xl shadow-lg border border-secondary-200/50 px-8 sm:px-12 py-12 sm:py-16
  - Inner content order: logo → subtitle → h1 → headline → description → search-wrapper → feature grid
  - All existing logic (handlers, state, modal) fully preserved
  - Gateway modal remains OUTSIDE hero card DOM tree (mounted at page root level)

VERIFY:
  - [ ] Hero card is max-w-[1040px] (not 960px, not 7xl)
  - [ ] Logo renders centered (h-16 w-16)
  - [ ] Subtitle is uppercase tracking-widest text-xs sm:text-sm
  - [ ] h1 is text-5xl md:text-7xl font-bold
  - [ ] Headline is text-xl md:text-2xl text-primary-700 font-semibold
  - [ ] Description is text-neutral-600 max-w-2xl mx-auto text-center
  - [ ] Gateway modal JSX is NOT inside hero card or max-width container
  - [ ] No routing/auth/service code changed (diff check)
```

**Risk:** `ExploreSearchHeader` internal padding may conflict with wrapper.
**Mitigation:** Use `overflow-hidden` on wrapper.
**Rollback:** `git checkout src/pages/HomePage.tsx`

---

### Task 2 — Add Feature Shortcut Row Inside Hero Card

**Agent:** `frontend-specialist`
**Priority:** P1
**Dependency:** Task 1

```
INPUT:
  - Hero card structure from Task 1
  - Icons: Music, Upload, BookOpen from lucide-react

OUTPUT:
  - 3-column grid below search bar
  - Each card is a <Link> with group class for group-hover propagation
  - Responsive: grid-cols-1 sm:grid-cols-3
  - Hover effects (all via group-hover):
      • Container: shadow-md + -translate-y-0.5 + border-secondary-300/70 + bg-cream-50/60
      • Icon: scale-110 + text-primary-600 (smooth scale via transition-transform)
      • Title: text-primary-700
      • Subtitle: static text-neutral-500 (no hover change)

VERIFY:
  - [ ] Exactly 3 cards in DOM
  - [ ] Each card root element has `group` class + is wrapped in <Link>
  - [ ] grid-cols-3 at sm+ breakpoint
  - [ ] Hover: shadow-md + -translate-y-0.5 on container
  - [ ] Hover: icon scales up (scale-110) and shifts to text-primary-600
  - [ ] Hover: title shifts to text-primary-700
  - [ ] No new component file created
  - [ ] transition-all / transition-transform durations consistent (200ms)
```

**Rollback:** Remove feature grid block from hero card JSX

---

### Task 3 — Add Quote Separator Block

**Agent:** `frontend-specialist`
**Priority:** P2 (independent)

```
INPUT:
  - Hero card section from Task 1

OUTPUT:
  - <section> below hero card, py-10 sm:py-12 (reduced — footer stays visually close)
  - <blockquote> italic text-neutral-500 text-lg max-w-[640px] mx-auto
  - Lotus ornament below: text-primary-400 text-2xl mt-4

VERIFY:
  - [ ] Quote text matches exactly
  - [ ] Italic + muted gray styling
  - [ ] Lotus ornament visible below text
  - [ ] Section uses py-10 sm:py-12 (NOT py-16 or py-20)
  - [ ] Footer appears visually close to quote (no excessive gap)
```

---

### Task 4 — Footer Spacing & Alignment Refinement

**Agent:** `frontend-specialist`
**Priority:** P2 (independent)

```
INPUT:
  - src/components/layout/Footer.tsx (current: px-8 py-12, no max-width centering)

OUTPUT:
  - Inner grid wrapped in max-w-[1040px] mx-auto  ← aligned with hero card width
  - Padding: px-10 sm:px-16 py-14
  - All logic (handleCopyEmail, user role check, links) unchanged

VERIFY:
  - [ ] Footer inner content max-w-[1040px] (aligned with hero card)
  - [ ] Red gradient bg remains
  - [ ] rounded-2xl top corners remain
  - [ ] Copyright line unchanged
  - [ ] No TypeScript errors
```

---

### Task 5 — Final Lint & Type Check

**Priority:** P3 (final gate)
**Dependency:** Tasks 1–4

```
INPUT:
  - All modified files

COMMANDS:
  npm run lint
  npx tsc --noEmit

VERIFY:
  - [ ] 0 lint errors
  - [ ] 0 TypeScript errors
  - [ ] No unused imports added
  - [ ] No console.log statements
```

---

## 🔗 Dependency Graph

```
Task 1 (Hero card)
    └─→ Task 2 (Feature cards — inside hero card)

Task 3 (Quote)  ─────────────────────────────────┐
Task 4 (Footer) ─────────────────────────────────┼─→ Task 5 (Lint + TS)
Task 1 + Task 2 ─────────────────────────────────┘
```

---

## ⚠️ Constraints & Guard Rails

### DO NOT Change
- `useNavigate`, `useCallback`, `handleHomeSemanticSubmit`
- `isGatewayModalOpen` state + modal JSX
- `ExploreSearchHeader` props
- `SHOW_HOME_RECORDING_HIGHLIGHTS` flag
- `fetchRecordings` / `fetchApprovedLocalRecordings` functions
- `SectionHeader` component
- Any imports from `@/services/`, `@/stores/`, `@/api/`

### 🚨 Gateway Modal DOM Constraint (NEW)
> **The gateway modal (`isGatewayModalOpen && <div .../>`) MUST remain mounted at the page root level.**
- ❌ DO NOT move modal JSX inside the hero card `<section>`
- ❌ DO NOT move modal inside the `max-w-[1040px]` container div
- ✅ Modal must remain a sibling of the main content wrapper, as currently mounted
- ✅ Keep `fixed inset-0 z-[100]` positioning and all modal logic unchanged
- **Rationale:** Modal uses `fixed` positioning and relies on viewport-level stacking context. Moving it inside a positioned ancestor could break z-index isolation.

### Tailwind Token Rules
- Hero card bg: `bg-surface-panel` (not `bg-white` — already overridden to cream in index.css)
- Border: `border-secondary-200/50`
- Yellow button: `bg-secondary-400 hover:bg-secondary-500`
- Feature card hover border: `hover:border-secondary-300/70`
- Feature card hover bg: `hover:bg-cream-50/60`
- **No purple/violet tokens — Purple Ban ✅**

### Responsive Rules
- Mobile: single column, full-width card
- sm (640px+): feature cards become 3-column
- lg (1024px+): hero card `max-w-[1040px]` centered

---

## 🔍 Phase X: Verification Checklist

```bash
npx tsc --noEmit
npm run lint
npm run dev  # manual visual check
## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-04-30
```

### Manual Visual Checks
- [ ] Hero card centered, ~1040px wide at desktop
- [ ] Background cream/light unchanged
- [ ] Search bar placeholder text correct (Vietnamese)
- [ ] 3 feature cards equal width in same row
- [ ] Quote block italic with lotus ornament (py-10 sm:py-12 spacing)
- [ ] Footer aligns with hero card (max-w-[1040px])
- [ ] Feature card icons scale on hover, title color shifts
- [ ] Mobile collapses gracefully
- [ ] Gateway modal still opens on search (auth flow intact)
- [ ] Gateway modal DOM is outside hero card and max-width container

### Rule Compliance
- [ ] No purple/violet hex codes
- [ ] No standard template layouts
- [ ] No new component files created unnecessarily

---

## ✅ EXIT GATE

```
[OK] Plan file written to docs/PLAN-homepage-refactor.md
[OK] All required sections present
[OK] 5 tasks defined with INPUT → OUTPUT → VERIFY
[OK] Dependency graph documented
[OK] Constraints documented
→ Ready for implementation
```
