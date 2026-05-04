import { interpolate } from './interpolate';

export const MESSAGE_CATALOG = {
  'common.network': 'Không có kết nối mạng. Vui lòng thử lại.',
  'common.timeout': 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.',
  'common.unknown': 'Đã xảy ra lỗi. Vui lòng thử lại.',

  'common.http_400': 'Yêu cầu không hợp lệ.',
  'common.http_401': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  'common.http_403': 'Bạn không có quyền thực hiện thao tác này.',
  'common.http_404': 'Không tìm thấy dữ liệu.',
  'common.http_422': 'Dữ liệu không hợp lệ.',
  'common.http_500': 'Máy chủ gặp lỗi. Vui lòng thử lại sau.',

  'moderation.delete.success': 'Đã xóa bản thu khỏi hệ thống.',
  'moderation.delete.failed':
    'Xóa thất bại. Có thể bạn không có quyền hoặc bản thu đã bị xóa trước đó.',

  'moderation.approve.local_failed': 'Không thể lưu trạng thái phê duyệt cục bộ. Thử lại.',
  'moderation.approve.server_failed':
    'Máy chủ không ghi nhận phê duyệt. Đã hoàn tác trên giao diện — vui lòng thử lại.',

  'moderation.reject.local_failed': 'Không thể lưu trạng thái từ chối cục bộ. Thử lại.',
  'moderation.reject.server_failed':
    'Máy chủ không ghi nhận từ chối. Đã hoàn tác trên giao diện — vui lòng thử lại.',

  'moderation.wizard.step_incomplete':
    'Vui lòng hoàn thành tất cả các yêu cầu bắt buộc ở Bước {{step}} trước khi hoàn thành kiểm duyệt bản thu!',
  'moderation.wizard.ready_for_approve':
    'Đã hoàn tất các bước kiểm tra. Vui lòng xác nhận phê duyệt ở hộp thoại tiếp theo.',

  'moderation.approve.success': 'Đã phê duyệt bản thu.',
  'moderation.reject.notes_required':
    'Vui lòng nhập ghi chú chuyên gia (mục xác nhận) trước khi từ chối.',

  'auth.profile.sync_success': 'Cập nhật hồ sơ đã được đồng bộ với server.',
  'auth.login.success': 'Đăng nhập thành công.',

  'upload.ai.partial_fail': 'Phân tích AI thất bại — Vẫn tiếp tục tải lên bình thường.',
  'upload.ai.success_detail': 'Phân tích AI thành công — Đã tự động điền các thông tin gợi ý.',
  'upload.save.success_edit': 'Thành công — Đã cập nhật bản chỉnh sửa.',
  'upload.save.success_draft': 'Thành công — Đã lưu bản nháp thành công.',
} as const;

export type MessageKey = keyof typeof MESSAGE_CATALOG;

export function resolveCatalogMessage(
  key: MessageKey,
  vars?: Record<string, string | number | undefined>,
): string {
  return interpolate(MESSAGE_CATALOG[key], vars);
}

/** Chuẩn hóa pattern cũ notify(title, message) thành một dòng cho toast. */
export function notifyLine(title: string, message: string): string {
  return `${title} — ${message}`;
}
