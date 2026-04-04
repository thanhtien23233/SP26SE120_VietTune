# PLAN-knowledge-graph.md

Cấu trúc và quy trình triển khai tính năng Knowledge Graph cho nền tảng Researcher Portal.

## 1. Overview
- **What**: Cấu trúc lại và xây dựng trang dashboard bên trong `ResearcherPortalPage.tsx` chứa một Component hiển thị Đồ thị Tri thức (`KnowledgeGraphViewer.tsx`).
- **Why**: Giúp các học giả nghiên cứu trực quan toàn bộ hệ sinh thái dữ liệu âm nhạc mà không bị đứt gãy luồng công việc, thay vì phải tải các trang khác nhau.

## 2. Project Type
**WEB** (Primary Agent: `frontend-specialist`)

## 3. Success Criteria
- [ ] Component `KnowledgeGraphViewer` render thành công và nhúng trực tiếp trên giao diện `ResearcherPortalPage`.
- [ ] Tích hợp thư viện `react-force-graph` (bản 2D).
- [ ] Đồ thị biểu diễn đủ 5 loại Nodes: Vùng miền, Dân tộc, Nghi lễ/Loại hình, Nhạc cụ, Bản thu.
- [ ] Tương tác đồ thị mượt mà: Focus Mode (làm mờ node không liên kết trực tiếp), Tooltip (có hỗ trợ HTML).
- [ ] Phân chia Layout hợp lý (Dashboard song song hoặc tab) không gây ảnh hưởng luồng Researcher.

## 4. Tech Stack
- **Library Đồ thị**: `react-force-graph` (Bản 2D: `react-force-graph-2d` / `react-force-graph` chung).
- **Data Fetching**: Frontend API Call & Mapper từ 5 luồng API có sẵn.

## 5. File Structure
```text
src/
└── components/
    └── knowledge-graph/
        ├── KnowledgeGraphViewer.tsx (Component Đồ thị)
        └── CustomNodeTooltip.tsx    (Tooltip có hình/Text)
```

## 6. Task Breakdown

### Task 1: Setup Library & DTOs
- **Agent**: `frontend-specialist`
- **Skill**: `react-best-practices`
- **INPUT**: Cài dependency `react-force-graph-2d` hoặc họ liên quan (thường dùng chung `force-graph`). Chuẩn bị TypeScript Type cho nodes, links.
- **OUTPUT**: File `package.json` thay đổi. Thư mục `src/types/graph.ts`.
- **VERIFY**: NPM install không báo lỗi.

### Task 2: Build Component & Graph Physics
- **Agent**: `frontend-specialist`
- **INPUT**: Khởi tạo layout `<ForceGraph2D />`. Phân phối Base Color và Base Size.
- **OUTPUT**: File `KnowledgeGraphViewer.tsx` xử lý UI. 
- **VERIFY**: Component render hiện dummy nodes, nhảy (spring) theo liên kết.

### Task 3: Interactive Tooltip & Focus Focus
- **Agent**: `frontend-specialist`
- **INPUT**: Thêm state `highlightNodes`, `highlightLinks`, `hoverNode`. Áp dụng mờ đi (opacity fading) cho node ngoại vi.
- **OUTPUT**: Component cập nhật được hành vi hover và click. 
- **VERIFY**: Kéo thả có lực, hover làm nổi bật các cạnh và node liên đới.

### Task 4: API Data Mapper
- **Agent**: `frontend-specialist` + `backend-specialist`
- **INPUT**: Dữ liệu thật từ 5 endpoints: Province, Ethnic, Ceremony, Instrument, Recording -> Xây dựng hàm Mapper tạo mảng Nodes liên kết dạng Tree / Graph.
- **OUTPUT**: Code fetch API thực tế.
- **VERIFY**: Đồ thị không còn dữ liệu dummy. Tồn tại rõ ràng Vùng (Bắc) -> Dân tộc (Tày) -> Nhạc cụ (Đàn Tính).

### Task 5: Dashboard Layout Integration
- **Agent**: `frontend-specialist`
- **INPUT**: Nhúng `KnowledgeGraphViewer` vào `ResearcherPortalPage.tsx`. Split pane UI.
- **OUTPUT**: File `ResearcherPortalPage.tsx` sửa chữa lại CSS lưới.
- **VERIFY**: Khả năng mở đóng / co giãn biểu đồ bên cạnh danh sách text.

## 7. Open Questions
> [!IMPORTANT]
> **Câu hỏi chờ quyết định của bạn trước khi chúng tôi chạy Code:**
> 1. Thư viện `react-force-graph` hiện đang xuất xưởng cả bản 2D, 3D, và VR. Dựa vào yêu cầu Custom Tooltip có ảnh thumbnail, tôi đề xuất dùng mặc định bản **2D** (Canvas, dễ tương tác HTML hơn bản WebGL 3D), bạn đồng ý chứ?
> 2. Về vị trí nhúng vào trang ResearcherPortalPage, bạn muốn Đồ thị chiếm nửa màn hình (Split View) hay là một Modal (Popup) hoặc Tab tách biệt để có khung nhìn rộng nhất?

## X. Phase X: Verification
- [ ] Linter & Type Check (npm run lint).
- [ ] Chạy `npm run dev` load ít nhất 200 node mà FPS ~ 60.
- [ ] Các Script audit (UX).
