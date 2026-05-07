# PLAN: §F — Collection Analytics (Coverage Gap Charts)

**Slug:** `collection-analytics`
**Ngày tạo:** 2026-04-10
**Tham chiếu:** `PLAN-feature-gaps.md §F`
**Phạm vi:** Frontend only — cải thiện tab Analytics trong AdminDashboard, thêm biểu đồ & leaderboard.

---

## Context Check (Phase -1)

### Swagger API hiện tại

✅ **Xác nhận (2026-04-10):** Tất cả `/api/Analytics/*` endpoints đã có trong Swagger JSON live (lines 724–783). BE đã deploy đầy đủ.

| Method | Endpoint | FE service | Gọi bởi AdminDashboard? |
|--------|----------|-----------|------------------------|
| `GET` | `/Analytics/overview` | `getOverview()` | ✅ Có |
| `GET` | `/Analytics/coverage` | `getCoverage()` | ❌ **CHƯA BAO GIỜ** |
| `GET` | `/Analytics/submissions` | `getSubmissionsTrend()` | ✅ Có |
| `GET` | `/Analytics/contributors` | `getContributors()` | ✅ Có |
| `GET` | `/Analytics/experts` | `getExperts()` | ✅ Có |
| `GET` | `/Analytics/content` | `getContent()` | ❌ **CHƯA BAO GIỜ** |

### Hiện trạng FE (từ audit)

| Khu vực | Có | Thiếu |
|---------|-----|-------|
| `analyticsApi.ts` | 6 methods + 5 types | — (đã đủ) |
| `src/types/` | Không có analytics types riêng (types nằm trong service) | Cần tách ra `src/types/analytics.ts` |
| Chart library | `react-force-graph-2d` (chỉ cho knowledge graph) | **Không có** recharts/chart.js |
| AdminDashboard tab analytics | 3 summary cards + dân tộc chips + monthly chips + top contributor list | **Thiếu:** bar chart coverage, gap badges, content analytics, contributor leaderboard table |
| `gapData` | Tính thủ công từ `/EthnicGroup` + local recordings | Cần thay bằng `getCoverage()` API |
| `regionCounts` | Tính thủ công nhưng **không hiển thị** | Cần hiển thị |

### Thư viện biểu đồ — Quyết định

**Chọn: `recharts`**
- React-first, composable, lightweight
- Hỗ trợ BarChart, PieChart, Tooltip, ResponsiveContainer — đủ cho §F
- Dự án chưa có — cần `npm install recharts`

---

## Phase 0 — Socratic Gate (Chốt thiết kế)

| Câu hỏi | Chốt |
|---------|------|
| Chart library? | **recharts** — install mới |
| Tách component hay inline? | **Tách file** — `CoverageGapChart.tsx`, `ContentAnalyticsPanel.tsx`, `ContributorLeaderboard.tsx` |
| getCoverage trả về gì? | `CoverageRow[]` — có `name/ethnicity/region/count` |
| getContent trả về gì? | `ContentAnalyticsDto` — `totalSongs`, `byEthnicity`, `byRegion` |
| AdminDashboard.tsx đã quá lớn? | **Có** (~2200 dòng) → tách analytics components giúp giảm complexity |
| Region heatmap? | **Defer** — không làm trong phase này (optional trong plan gốc) |
| Khi API trả về lỗi/rỗng? | Fallback về dữ liệu hiện có (gapData thủ công) + hiển thị warning |

---

## Thiết kế tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│ AdminDashboard → step === 'analytics'                           │
│                                                                 │
│ ┌─────────────┬─────────────┬─────────────┐                     │
│ │ Tổng bản ghi │ Dân tộc     │ Người dùng  │  (existing cards)  │
│ └─────────────┴─────────────┴─────────────┘                     │
│                                                                 │
│ ┌──────────────────────────────────────────┐                     │
│ │ CoverageGapChart (NEW — recharts)        │                     │
│ │ ┌──────────────────────────────────────┐ │                     │
│ │ │ Horizontal BarChart — ethnicity/count │ │                     │
│ │ │ Gap badges cho dân tộc chưa coverage │ │                     │
│ │ └──────────────────────────────────────┘ │                     │
│ └──────────────────────────────────────────┘                     │
│                                                                 │
│ ┌──────────────────────────────────────────┐                     │
│ │ ContentAnalyticsPanel (NEW)              │                     │
│ │ ┌──────┬──────────────┬────────────────┐ │                     │
│ │ │Total │ByEthnicity   │ByRegion PieChart│ │                     │
│ │ │Songs │BarChart      │                │ │                     │
│ │ └──────┴──────────────┴────────────────┘ │                     │
│ └──────────────────────────────────────────┘                     │
│                                                                 │
│ ┌──────────────────────────────────────────┐                     │
│ │ Đóng góp theo tháng (existing chips →    │                     │
│ │  UPGRADE to BarChart monthly trend)      │                     │
│ └──────────────────────────────────────────┘                     │
│                                                                 │
│ ┌──────────────────────────────────────────┐                     │
│ │ ContributorLeaderboard (NEW — table)     │                     │
│ │ # | Name | Contributions | Approved      │                     │
│ │ 1 | ...  | 42            | 38            │                     │
│ │ 2 | ...  | 31            | 28            │                     │
│ └──────────────────────────────────────────┘                     │
│                                                                 │
│ ┌──────────────────────────────────────────┐                     │
│ │ Nhạc cụ (existing — keep as-is)          │                     │
│ └──────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Install recharts + Tách analytics types

### 1.1 Install recharts

```bash
npm install recharts
```

### 1.2 Tạo `src/types/analytics.ts`

Move types từ `analyticsApi.ts` sang file riêng, giữ re-export để không break existing imports:

```typescript
export type AnalyticsOverview = { ... };
export type CoverageRow = { ... };
export type ContributorRow = { ... };
export type ExpertPerformanceDto = { ... };
export type ContentAnalyticsDto = { ... };
```

### 1.3 Update `analyticsApi.ts`

Import types từ `@/types/analytics` thay vì define inline.

### 1.4 Update `src/types/index.ts`

Thêm: `export * from '@/types/analytics';`

### Files thay đổi Phase 1:
| File | Loại |
|------|------|
| `package.json` / `package-lock.json` | Sửa (npm install) |
| `src/types/analytics.ts` | **Mới** |
| `src/services/analyticsApi.ts` | Sửa (import from types) |
| `src/types/index.ts` | Sửa |

---

## Phase 2 — CoverageGapChart component

### 2.1 Tạo `src/components/features/analytics/CoverageGapChart.tsx`

**Props:**
```typescript
interface CoverageGapChartProps {
  className?: string;
}
```

**Logic:**
- Call `analyticsApi.getCoverage()` on mount
- Render `recharts` horizontal `BarChart`:
  - Y-axis: ethnicity name
  - X-axis: count (số bản thu)
  - Tooltip: hiển thị name + count
- Gap analysis: identify ethnicities with `count === 0` or `count < threshold` → render gap badges dưới chart
- Loading/error/empty states
- Fallback: nếu API fail → hiển thị warning + không render chart

### Files thay đổi Phase 2:
| File | Loại |
|------|------|
| `src/components/features/analytics/CoverageGapChart.tsx` | **Mới** |

---

## Phase 3 — ContentAnalyticsPanel + MonthlyTrendChart

### 3.1 Tạo `src/components/features/analytics/ContentAnalyticsPanel.tsx`

**Logic:**
- Call `analyticsApi.getContent('songs')` on mount
- Render:
  - "Tổng bài hát" card
  - `byEthnicity` → horizontal BarChart (top 15 ethnicity by count)
  - `byRegion` → PieChart hoặc horizontal BarChart (nếu quá nhiều regions)
- Loading/error/empty states

### 3.2 Tạo `src/components/features/analytics/MonthlyTrendChart.tsx`

**Props:**
```typescript
interface MonthlyTrendChartProps {
  data: Record<string, number>;
  className?: string;
}
```

**Logic:**
- Convert `{ "2026-03": 12, "2026-04": 8 }` → `[{ month: "03/2026", count: 12 }, ...]`
- Render `recharts` vertical `BarChart` hoặc `LineChart`
- Replaces existing monthly chips in AdminDashboard

### Files thay đổi Phase 3:
| File | Loại |
|------|------|
| `src/components/features/analytics/ContentAnalyticsPanel.tsx` | **Mới** |
| `src/components/features/analytics/MonthlyTrendChart.tsx` | **Mới** |

---

## Phase 4 — ContributorLeaderboard component

### 4.1 Tạo `src/components/features/analytics/ContributorLeaderboard.tsx`

**Props:**
```typescript
interface ContributorLeaderboardProps {
  className?: string;
}
```

**Logic:**
- Call `analyticsApi.getContributors()` on mount
- Sort by `contributionCount` descending
- Render table with columns:
  - Rank (#)
  - Name (`fullName || username`)
  - Contributions (`contributionCount || submissions`)
  - Approved (`approvedCount`)
  - Rejected (`rejectedCount`)
- Show top 20 (configurable) with "Xem tất cả" toggle
- Loading/error/empty states

### Files thay đổi Phase 4:
| File | Loại |
|------|------|
| `src/components/features/analytics/ContributorLeaderboard.tsx` | **Mới** |

---

## Phase 5 — Integrate vào AdminDashboard

### 5.1 Thay thế analytics tab content

- **Giữ:** 3 summary cards (Tổng bản ghi, Dân tộc, Người dùng)
- **Giữ:** Nhạc cụ chips section
- **Thay:** "Dân tộc" chips section → `<CoverageGapChart />`
- **Thay:** "Đóng góp theo tháng" chips → `<MonthlyTrendChart data={monthlyCountsFinal} />`
- **Thay:** "Người đóng góp tích cực" list → `<ContributorLeaderboard />`
- **Thêm:** `<ContentAnalyticsPanel />` (giữa coverage chart và monthly trend)
- **Xóa:** logic tính `gapData` thủ công (không còn cần thiết, chart component tự fetch)
- **Xóa:** `regionCounts` computed nhưng không dùng

### 5.2 Thêm `getCoverage` + `getContent` vào Promise.allSettled (optional)

Hoặc để từng component tự fetch (ít coupling hơn). **Chọn: component tự fetch** — đơn giản hơn, component reusable.

### Files thay đổi Phase 5:
| File | Loại |
|------|------|
| `src/pages/admin/AdminDashboard.tsx` | Sửa |

---

## Phase X — Verification Checklist

### Kết quả automated checks (2026-04-10)

- ✅ `npm run lint` — PASS
- ✅ `npm run build` — PASS
- ✅ `npm run test:unit` — PASS (12 files, 38 tests)
- ✅ `recharts` installed (dependency added to `package.json` and lockfile)

### Ghi chú fix trong vòng xác minh

- Đã xử lý 1 lint/TS issue phát sinh trong Phase X:
  - `AdminDashboard.tsx`: biến `rec` không dùng (removed)
  - Recharts Tooltip formatter type mismatch trong:
    - `CoverageGapChart.tsx`
    - `ContentAnalyticsPanel.tsx`
    - `MonthlyTrendChart.tsx`

### Trạng thái checklist

| # | Kiểm tra | Type |
|---|----------|------|
| 1 | `npm run lint` passes | Auto ✅ |
| 2 | `npm run build` passes | Auto ✅ |
| 3 | `npm run test:unit` passes | Auto ✅ |
| 4 | `recharts` installed, no version conflict | Auto ✅ |
| 5 | CoverageGapChart renders BarChart từ getCoverage() API data | Manual |
| 6 | Gap badges hiển thị cho dân tộc count=0 | Manual |
| 7 | ContentAnalyticsPanel renders byEthnicity + byRegion charts | Manual |
| 8 | MonthlyTrendChart renders bar/line chart thay thế chips | Manual |
| 9 | ContributorLeaderboard renders sorted table | Manual |
| 10 | AdminDashboard analytics tab loads without regression | Manual |
| 11 | API failure → graceful fallback (warning, no crash) | Manual |
| 12 | Responsive: charts hiển thị đúng trên mobile | Manual |

---

## File Delivery Summary

| File | Loại | Phase |
|------|------|-------|
| `src/types/analytics.ts` | **Mới** | Phase 1 |
| `src/services/analyticsApi.ts` | Sửa | Phase 1 |
| `src/types/index.ts` | Sửa | Phase 1 |
| `src/components/features/analytics/CoverageGapChart.tsx` | **Mới** | Phase 2 |
| `src/components/features/analytics/ContentAnalyticsPanel.tsx` | **Mới** | Phase 3 |
| `src/components/features/analytics/MonthlyTrendChart.tsx` | **Mới** | Phase 3 |
| `src/components/features/analytics/ContributorLeaderboard.tsx` | **Mới** | Phase 4 |
| `src/pages/admin/AdminDashboard.tsx` | Sửa | Phase 5 |

**Ước tính effort:** ~4–5 giờ
**Phụ thuộc backend:** ✅ Tất cả 4 Analytics endpoints đã deploy (confirmed in Swagger 2026-04-10)
**Chart library:** `recharts` (cần install)
**Trạng thái đồng bộ:** ✅ Đã cập nhật `§F` thành “Hoàn thành (code)” trong `docs/PLAN-feature-gaps.md`.
**Rủi ro:**
1. `ContentAnalyticsDto` shape chưa verify response thực tế → cần test runtime
2. AdminDashboard.tsx quá lớn (~2200 dòng) → Phase 5 chỉ thay thế, không refactor toàn bộ
