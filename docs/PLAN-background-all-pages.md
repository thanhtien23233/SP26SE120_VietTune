# PLAN — Set `background.png` Across All Pages

> **Status**: Implemented (Phases 1-3 completed)
> **Scope**: 9 pages with opaque root backgrounds that block `MainLayout` background image
> **Goal**: Make `background.png` visible behind all page content (like HomePage already does)

---

## Context

`MainLayout.tsx` already applies `background.png` as a background on `<main>` with `cover`, `top center`, and dynamic `fixed/scroll` attachment. **HomePage** already works correctly because we set its root to `bg-transparent`.

However, **9 other pages** still have opaque root-level backgrounds (`bg-gradient-to-b`, `bg-neutral-50`, `bg-[#fff2d6]`) that completely cover the layout background image.

### Strategy

For each page: change the root wrapper's opaque background to `bg-transparent` so the `MainLayout` background shows through. Inner cards/panels keep their own backgrounds (they need contrast for readability).

---

## Implementation Result (9 files)

### Phase 1 — Gradient pages (5 files) — completed

These all use `bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35` on root. Change to `bg-transparent`.

| # | File | Line | Current root className |
|---|------|------|------------------------|
| 1 | `src/pages/ExplorePage.tsx` | ~383 | `min-h-screen bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35` |
| 2 | `src/pages/ContributionsPage.tsx` | ~701 | `min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35` |
| 3 | `src/pages/ModerationPage.tsx` | ~874 | `min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35` |
| 4 | `src/pages/researcher/ResearcherPortalPage.tsx` | ~759 | `min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35` |
| 5 | `src/pages/UploadPage.tsx` | ~31 | `min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35` |

**Change for each:**
```
// Before
className="min-h-screen [min-w-0] bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35"

// After
className="min-h-screen [min-w-0] bg-transparent"
```

### Phase 2 — Solid background pages (2 files) — completed

| # | File | Line | Current root className |
|---|------|------|------------------------|
| 6 | `src/pages/NotFoundPage.tsx` | ~7 | `min-h-screen ... bg-neutral-50` |
| 7 | `src/pages/ForbiddenPage.tsx` | ~12 | `min-h-screen ... bg-neutral-50` |

**Change:** Remove `bg-neutral-50` → add `bg-transparent`

### Phase 3 — Special pages (2 files) — completed

| # | File | Line | Current root className |
|---|------|------|------------------------|
| 8 | `src/pages/auth/ConfirmAccountPage.tsx` | ~53 | `min-h-screen bg-[#fff2d6] ...` |
| 9 | `src/pages/KbEntryPublicViewPage.tsx` | ~57 | `min-h-[50vh] bg-gradient-to-b from-cream-50 to-secondary-50/30 ...` |

**Change:** Remove opaque bg → `bg-transparent`

---

## Pages Already OK (no change needed)

| Page | Why OK |
|------|--------|
| `HomePage.tsx` | Already `bg-transparent` |
| `TermsPage.tsx` | Root has `min-h-screen` only, no bg |
| `CreateExpertPage.tsx` | Root has `min-h-screen` only |
| `AboutPage.tsx` | No opaque root bg |
| `ProfilePage.tsx` | No opaque root bg |
| `ChatbotPage.tsx` | No opaque root bg |
| `SearchPage.tsx` | No opaque root bg |
| `SemanticSearchPage.tsx` | No opaque root bg |
| `MastersPage.tsx` | No opaque root bg |
| `InstrumentsPage.tsx` | No opaque root bg |
| `EthnicitiesPage.tsx` | No opaque root bg |
| `RecordingDetailPage.tsx` | No opaque root bg |
| `EditRecordingPage.tsx` | No opaque root bg |
| `NotificationPage.tsx` | No opaque root bg |
| `ApprovedRecordingsPage.tsx` | No opaque root bg |
| `AdminDashboard.tsx` | No opaque root bg |
| `KnowledgeBasePage.tsx` | Root is `<KnowledgeBasePanel />` |
| `LoginPage.tsx` | Standalone layout (not in MainLayout) |
| `RegisterPage.tsx` | Standalone layout (not in MainLayout) |

---

## Files Changed Summary (Actual)

| File | Change |
|------|--------|
| `src/pages/ExplorePage.tsx` | Root bg → `bg-transparent` |
| `src/pages/ContributionsPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/ModerationPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/researcher/ResearcherPortalPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/UploadPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/NotFoundPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/ForbiddenPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/auth/ConfirmAccountPage.tsx` | Root bg → `bg-transparent` |
| `src/pages/KbEntryPublicViewPage.tsx` | Root bg → `bg-transparent` |

---

## Không thay đổi

- Nội dung bên trong (cards, panels, modals) — giữ nguyên nền riêng
- Logic/API/routing — không đụng
- `MainLayout.tsx` — không đụng (đã có background)
- `LoginPage` / `RegisterPage` — standalone, không qua MainLayout

---

## Verification Checklist

- [x] 9 trang mục tiêu đã đổi root background sang `bg-transparent`
- [x] Nội dung bên trong (cards/panels/modals) giữ nguyên nền riêng
- [x] Không có lỗi lint mới ở tất cả file đã chỉnh
- [ ] Xác nhận thị giác toàn bộ trang (desktop/mobile)
- [ ] Build thành công (`npm run build`)
