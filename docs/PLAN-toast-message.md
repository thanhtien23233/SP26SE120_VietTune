# PLAN: Toast Message Toan Du An

## Phase -1: Context Check

- **Muc tieu:** Thiet ke he thong toast message thong nhat cho toan bo du an.
- **Uu tien:** Toc do trien khai so mot — wrapper som, migration dan, tranh over-engineering.
- **Pham vi:** Toan bo frontend + luong service/API lien quan den thong bao nguoi dung.
- **Rang buoc:** Ban dau chi lap ke hoach; implement tien hanh theo phases ben duoi.
- **Dau vao da xac nhan (Socratic Gate):**
  - Scope: full-project
  - Style: balanced
  - Tech direction: tao wrapper/service thong nhat
  - Language: tieng Viet

## Nguyen tac cot loi (da chot)

### 1) Wrapper `uiToast` tren thu vien co san — khong them dependency

- **Ly do:** Du an da co `react-hot-toast` (`src/App.tsx`). Khong lang phi thoi gian them thu vien moi hay fix xung dot.
- **Gia tri:** Tat ca component/service **chi** goi `uiToast`; UI **khong** import truc tiep `react-hot-toast` (hoac ten thu vien thay the sau nay).
- **Doi "ruot":** Neu sau nay doi sang `sonner` hoac renderer khac, chi sua **mot file** implementation ben trong wrapper — thoi gian uoc tinh toi thieu, do rui ro tap trung.

### 2) Xu ly loi: Local catch + helper — tuyet doi khong auto-toast trong Axios Interceptor

- **Ly do:** Goi toast trong interceptor toan cuc de gay tham hoa UX: nhieu API song song loi mang = nhieu toast do chong len nhau; API chay ngam loi thinh thoang lai pop len mat nguoi dung.
- **Interceptor chi lam:** Chuan hoa cau truc loi (boc tach HTTP/response thanh mot object thong nhat, vi du `{ code, rawMessage }` hoac tuong duong trong code base).
- **O tang UI / service tuong ung:** Dev **chu dong** goi `uiToast.fromApiError(err)` (hoac pattern tuong duong) khi muon bao nguoi dung.
- **Quyen quyet dinh:** "Co bao loi hay nuot loi" **bat buoc** thuoc ngu canh thao tac — khong ep buoc o lop mang.

### 3) Message catalog: Plain object TypeScript

- **Ly do:** Mang framework nhu `react-i18next` chi de chuan hoa thong bao la phi hop ly voi muc tieu hien tai.
- **Giai phap:** Mot `Record<string, string>` (hoac object co key literal de type-safe) la du.
- **Chuoi dong:** Vi du `"Da xoa thanh cong ban thu {{id}}"` — chi can helper noi suy nho (Regex hoac replace theo tung buoc) de thay `{{key}}` bang gia tri. Gon nhe, TypeScript van kiem soat key message.

## Hien Trang Du An (cap nhat sau Phase 1–4)

- **Toast:** Toan bo phan hoi ngan qua `@/uiToast` + catalog; `react-hot-toast` chi trong `App.tsx` (Toaster) va `src/uiToast/`.
- **notify(title, message):** da migrate; export `notify` trong `notificationStore` giu lai + `@deprecated`, ESLint cam import `notify` moi.
- **alert():** da loai khoi moderation flow da chuyen.
- **Dialog stack:** `NotificationProvider` + Zustand van co the dung cho UI modal dac thu (khong bat buoc toast).
- **Mutation moderation:** `approveSubmissionOnServer` / `rejectSubmissionOnServer` tra `MutationResult`, UI log + toast khi can.
- **Tai lieu dev:** `docs/uiToast.md`.

## Muc Tieu Thiet Ke

- Mot API thong nhat de hien toast.
- Message nhat quan, tieng Viet; mo rong ngon ngu sau (neu can) khong bat buoc framework i18n — uu tien catalog + helper.
- Hien thi loi/thanh cong can bang, khong spam.
- Tach biet ro:
  - **Toast UI tam thoi** (phan hoi thao tac)
  - **Notification backend** (inbox su kien)

## Kien Truc De Xuat

### 1) Lop wrapper trung tam (`uiToast`)

- Implementation hien tai: goi `react-hot-toast` **chi** trong file wrapper (hoac thu muc `uiToast/`).
- Public API goi y:
  - `success(keyOrText, options?)`
  - `error(keyOrText, options?)`
  - `warning(keyOrText, options?)`
  - `info(keyOrText, options?)`
  - `promise(promise, { loading, success, error })`
  - `fromApiError(normalizedOrAxiosError, fallbackKey?)` — map sang catalog; khong tu dong goi o interceptor
- ESLint / convention (khi implement): cam import truc tiep `toast` tu `react-hot-toast` ngoai wrapper.

### 2) Message catalog (plain object)

- Dang: `Record<MessageKey, string>` hoac object `as const` + type `MessageKey` de an toan khi goi.
- Vi du key:
  - `auth.login.success`
  - `moderation.delete.success`
  - `moderation.delete.failed`
  - `upload.submit.success`
- Helper `interpolate(template, vars)`: thay `{{id}}`, `{{name}}`, ... — khong can thu vien i18n.
- Toan bo van ban user-facing uu tien tieng Viet trong catalog.

### 3) Error normalization (Interceptor vs UI)

- **Interceptor (`api.ts` hoac lop tuong duong):**
  - Chi: attach / transform error thanh shape thong nhat (`code`, `rawMessage`, tuy chon `status`).
  - **Khong** goi `uiToast`, `toast`, `notify`.
- **Caller:**
  - `try/catch` hoac `.catch()` o cho biet co can bao nguoi dung.
  - Neu can: `uiToast.fromApiError(err, 'moderation.delete.failed')`.
- `fromApiError` co the:
  - map `code` / HTTP status -> key catalog
  - fallback key khi khong khop
  - han che hien `rawMessage` truc tiep tru khi policy cho phep (vi du dev-only)
- Quy tac hien thong bao (do nguoi goi chon severity):
  - Loi nghiem trong: error
  - Loi co the tiep tuc: warning
  - Thanh cong: success ngan gon

### 4) Quy uoc hien thi

- Dong nhat vi tri, thoi gian, stack, dismiss.
- Dam bao a11y cho toast region (`aria-live` phu hop muc do).
- Khong dung `alert()` cho thong bao thuong; chi dung modal confirm khi destructive.

## Ke Hoach Trien Khai

### Phase 0: Chot quy uoc

- **Renderer:** `react-hot-toast` (khong them dependency moi).
- Chot naming convention cho message key + quy uoc placeholder `{{var}}`.
- Chot shape loi thong nhat sau interceptor (vi du `{ code, rawMessage }`).
- Chot severity matrix va style guide ngan cho toast.

### Phase 1: Tao nen tang wrapper

- Tao file(s) `uiToast` boc `react-hot-toast`.
- Tao message catalog + `interpolate`.
- Tao `fromApiError` doc shape loi da chuan hoa.
- Cap nhat interceptor (neu can): **chi** chuan hoa loi, khong toast.

### Phase 2: Migration uu tien cao

- Chuyen `ModerationPage` ve `uiToast`.
- Chuyen auth pages (`Login/Register`) ve `uiToast`.
- Chuyen upload/admin cac hanh dong quan trong ve `uiToast`.
- Loai bo `alert()` trong moderation wizard.

### Phase 3: Lam sach service layer

- Cac service khong nuot loi im lang cho action quan trong.
- Tra loi co cau truc de UI xu ly message thong qua wrapper.

### Phase 4: Hoan tat va khoa chat luong — **da thuc hien**

- Deprecate duong thong bao cu: ESLint cam `react-hot-toast` (tru App + `src/uiToast`) va cam import named `notify` tu `@/stores/notificationStore`.
- Checklist review PR: xem muc **Checklist PR — Toast** ben duoi.
- Tai lieu onboarding: **`docs/uiToast.md`**.

## Checklist PR — Toast

Truoc khi merge, reviewer xac nhan:

1. Khong import `react-hot-toast` ngoai `src/App.tsx` va `src/uiToast/**` (ESLint se bao).
2. Khong import `notify` tu `@/stores/notificationStore` (dung `uiToast` / `notifyLine`).
3. Khong them `alert()` cho thong bao thuong; destructive co the dung modal xac nhan.
4. Khong goi `uiToast` trong Axios interceptor / request interceptor.
5. Chuoi co dinh tieng Viet uu tien dat trong `MESSAGE_CATALOG` + key, tranh hardcode trai dai.
6. Loi API: uu tien `getNormalizedApiError` + `uiToast.fromApiError` hoac key catalog thich hop; service mutation co the tra `MutationResult`.

## Phan Cong Agent/Workstream

- **Agent A - Architecture:** thiet ke `uiToast`, options, typing.
- **Agent B - Content:** xay message catalog tieng Viet + quy tac dat key.
- **Agent C - Migration:** migrate theo tung module uu tien.
- **Agent D - QA/A11y:** test keyboard/screen reader + consistency.

## Verification Checklist (Phase X)

- [x] Interceptor **khong** goi toast / notify.
- [x] Khong con `alert(` trong moderation / wizard da migrate.
- [x] Khong con direct `toast`/`notify` o feature code; ESLint khoa import.
- [x] Cac action quan trong (xoa, duyet, reject, submit) co feedback qua `uiToast`.
- [x] Message hien thi nhat quan, uu tien tieng Viet (catalog).
- [x] Error API: normalized tren Axios error; `fromApiError` + `MutationResult` cho luong moderation.
- [x] Luong Notification inbox backend doc lap (khong thay doi boi toast refactor).
- [x] Tai lieu: `docs/uiToast.md`.

## Rui Ro Va Giam Thieu

- **Rui ro:** migration dang do gay thong bao lap.
  - **Giam thieu:** migration theo module, co checklist truoc merge.
- **Rui ro:** message key khong du.
  - **Giam thieu:** fallback key theo domain + review dinh ky.
- **Rui ro:** loi backend raw text khong dong nhat ngon ngu.
  - **Giam thieu:** map status/code truoc khi render.
- **Rui ro:** developer quen goi toast trong interceptor khi sua `api.ts`.
  - **Giam thieu:** code review + comment / lint rule neu co the.

## Ket Qua Mong Doi

- UX thong bao dong nhat toan he thong.
- Dev de them/sua message theo key, khong hardcode trai rac.
- Giam loi im lang, tang kha nang debug va do tin cay cua flow moderation/upload/auth.
- Doi renderer toast sau nay = thay doi tap trung, khong phai refactor lan toa toan UI.
