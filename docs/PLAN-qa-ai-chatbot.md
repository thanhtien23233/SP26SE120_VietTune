---
description: Kế hoạch phát triển và hoàn thiện AI Chatbox
---

# Kế hoạch Hoàn thiện AI Chatbox (QA AI)

## 1. Overview (Tổng quan)
Dựa trên mã nguồn Frontend hiện tại (`ChatbotPage.tsx`) và `swagger_summary.txt`, tính năng AI Chatbox đã có khung cơ bản (tạo hội thoại, gửi/nhận tin nhắn) nhưng thiếu các tính năng nâng cao và cấu trúc code chưa tối ưu (gọi API trực tiếp trong UI Component).
Mục tiêu: Refactor service layer, thêm tính năng Flag/Unflag tin nhắn, hiển thị nguồn (Source Citations), và cơ chế Expert Correction để chuyên gia có thể sửa câu trả lời của AI.

## 2. Project Type
**WEB** (Tiếp tục phát triển trên `frontend-specialist`)

## 3. Success Criteria (Tiêu chí thành công)
1.  **Kiến trúc sạch:** Tách toàn bộ logic gọi API ra khỏi `ChatbotPage.tsx` và chuyển vào `qaService.ts`.
2.  **Tính năng Flag:** Người dùng có thể cắm cờ (flag) / bỏ cắm cờ (unflag) các câu trả lời chưa chính xác của AI.
3.  **Trích dẫn nguồn:** UI hiển thị được danh sách `sourceRecordingIds` và `sourceKBEntryIds` từ tin nhắn trả về.
4.  **Cơ chế Chuyên gia:** (Tùy chọn hiển thị) Giao diện hiển thị được nội dung `expertCorrection` (nếu có chuyên gia đã sửa lại câu trả lời).
5.  **Không lỗi hồi quy:** Lịch sử hội thoại hiện tại vẫn hoạt động ổn định.

## 4. Tech Stack
-   **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons.
-   **Service:** Axios (REST API).

## 5. File Structure
```text
src/
├── services/
│   ├── qaConversationService.ts  (New: Quản lý Hội thoại)
│   ├── qaMessageService.ts       (New: Quản lý Tin nhắn, Flag, Unflag)
│   └── researcherChatService.ts  (Tối ưu lại hoặc gộp chung)
├── components/
│   ├── features/
│   │   └── chatbot/
│   │       ├── ChatMessageItem.tsx (New: Tách UI của một tin nhắn)
│   │       ├── ChatSidebar.tsx     (New: Tách UI của Lịch sử)
│   │       └── ChatSourceList.tsx  (New: UI hiển thị nguồn)
└── pages/
    └── ChatbotPage.tsx           (Cập nhật lại, sạch sẽ hơn)
```

## 6. Task Breakdown

### Task 1: Refactor API Service Layer
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`, `api-patterns`
- **Priority:** P1
- **INPUT:** Các hàm `createQAConversation`, `createQAMessage`, `fetchUserConversations`, `fetchConversationMessages` đang nằm cứng trong `ChatbotPage.tsx`.
- **OUTPUT:** Tạo file `qaConversationService.ts` và `qaMessageService.ts` chứa các lời gọi API tương ứng, thêm các hàm `flagMessage` và `unflagMessage`. Cập nhật interface khớp với Swagger.
- **VERIFY:** Build UI không lỗi, `ChatbotPage` vẫn gửi/nhận và load lịch sử bình thường sau khi chuyển qua dùng Service mới.

### Task 2: Refactor ChatbotPage.tsx thành Component nhỏ
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **INPUT:** `ChatbotPage.tsx` đang có ~500 dòng code.
- **OUTPUT:** Tách phần hiển thị tin nhắn thành `ChatMessageItem.tsx`, phần lịch sử thành `ChatSidebar.tsx`.
- **VERIFY:** UI không thay đổi về mặt giao diện, nhưng code dễ đọc và dễ test hơn.

### Task 3: Hiển thị Nguồn (Source Citations) & Expert Correction
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **INPUT:** Dữ liệu `sourceRecordingIdsJson`, `sourceKBEntryIdsJson`, `expertCorrection` bị bỏ qua trong logic hiện tại. 
- **OUTPUT:** Trong `ChatMessageItem.tsx`, thêm phần hiển thị nguồn (chip hoặc danh sách nhỏ) nếu có `sourceRecordingIdsJson/sourceKBEntryIdsJson` hợp lệ. Thêm banner/ghi chú từ `expertCorrection` (Câu trả lời đã được chuyên gia sửa lại).
- **VERIFY:** Mock dữ liệu tin nhắn có `sourceRecordingIdsJson` và `expertCorrection` → UI hiển thị phần trích dẫn nguồn và ghi chú của chuyên gia rõ ràng.

### Task 4: Tính năng Flag/Unflag Tin nhắn
- **Agent:** `frontend-specialist`
- **Skill:** `react-best-practices`
- **Priority:** P2
- **INPUT:** Endpoint `PUT /api/QAMessage/flagged` và `PUT /api/QAMessage/unflagged`.
- **OUTPUT:** Nút cắm cờ (Flag) tại mỗi tin nhắn của AI. Nhấn vào sẽ gọi API flag và đổi state UI. Nhấn lại sẽ unflag. Chỉ định cho phép flag nếu `role === 1` (assistant).
- **VERIFY:** Nhấn nút Flag -> API return 200 -> Icon màu đỏ/được fill. Load lại lịch sử -> Icon vẫn hiển thị trạng thái đã flag.

---

## ✅ PHASE X COMPLETE
*Chỉ đánh dấu check sau khi hoàn thành chạy các script dưới đây ở cuối quá trình Implement*
- [x] Lint: `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0`
- [x] Types: `npx tsc --noEmit`
- [x] UX Audit: `python .agent/skills/frontend-design/scripts/ux_audit.py src/pages/ChatbotPage.tsx`
- [x] Build: `npm run build`
- [x] No Purple/Violet hex codes (Luật UI)
- [x] Socratic Gate respected.
