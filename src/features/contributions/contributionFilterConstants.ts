/** `aria-controls` target for the filtered submissions list. */
export const CONTRIBUTIONS_SUBMISSIONS_PANEL_ID = 'contributions-submissions-panel';

export const CONTRIBUTOR_STATUS_TABS: Array<{ label: string; value: number | 'ALL' }> = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Bản nháp', value: 0 },
  { label: 'Chờ phê duyệt', value: 1 },
  { label: 'Yêu cầu cập nhật', value: 4 },
  { label: 'Đã duyệt', value: 2 },
  { label: 'Từ chối', value: 3 },
];

export const MODERATION_LEGEND_STEPS = [
  'Khởi tạo bản nháp',
  'Bước 1: Sàng lọc ban đầu',
  'Bước 2: Xác minh chi tiết',
  'Bước 3: Phê duyệt xuất bản',
] as const;
