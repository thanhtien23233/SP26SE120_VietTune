export const VERIFICATION_STEPS = [
  {
    step: 1,
    name: 'Initial Screening',
    wizardTitle: 'Bước 1: Kiểm tra sơ bộ',
    description: 'Đánh giá tính đầy đủ và phù hợp của thông tin',
    sectionTitle: 'Yêu cầu kiểm tra',
    notesLabel: 'Ghi chú kiểm tra sơ bộ',
    notesPlaceholder: 'Ghi chú về các vấn đề cần lưu ý hoặc cần bổ sung...',
    notesField: 'notes',
    fields: [
      {
        key: 'infoComplete',
        label:
          'Thông tin đầy đủ: Tiêu đề, nghệ sĩ, ngày thu, địa điểm, dân tộc, thể loại đã được điền đầy đủ',
      },
      {
        key: 'infoAccurate',
        label: 'Thông tin chính xác: Các thông tin cơ bản phù hợp và không có mâu thuẫn',
      },
      {
        key: 'formatCorrect',
        label: 'Định dạng đúng: File media hợp lệ, chất lượng đạt yêu cầu tối thiểu',
      },
    ],
  },
  {
    step: 2,
    name: 'Detail Verification',
    wizardTitle: 'Bước 2: Xác minh chuyên môn',
    description: 'Đánh giá bởi chuyên gia về tính chính xác và giá trị văn hóa',
    sectionTitle: 'Đánh giá chuyên môn',
    notesLabel: 'Đánh giá chuyên môn',
    notesPlaceholder: 'Đánh giá chi tiết về giá trị văn hóa, tính xác thực, và độ chính xác của bản thu...',
    notesField: 'expertNotes',
    fields: [
      {
        key: 'culturalValue',
        label: 'Giá trị văn hóa: Bản thu có giá trị văn hóa, lịch sử hoặc nghệ thuật đáng kể',
      },
      {
        key: 'authenticity',
        label: 'Tính xác thực: Bản thu là bản gốc, không phải bản sao chép hoặc chỉnh sửa không được phép',
      },
      {
        key: 'accuracy',
        label: 'Độ chính xác: Thông tin về dân tộc, thể loại, phong cách phù hợp với nội dung bản thu',
      },
      {
        key: 'instrumentsVerified',
        label:
          'Nhạc cụ đã xác minh: Đã kiểm tra danh sách nhạc cụ AI phát hiện, xác nhận hoặc bác bỏ từng nhạc cụ',
      },
      {
        key: 'metadataSuggestionsVerified',
        label:
          'Metadata AI đã xác minh: Đã duyệt các gợi ý dân tộc, khu vực, lối hát và loại sự kiện từ AI',
      },
    ],
  },
  {
    step: 3,
    name: 'Final Publication',
    wizardTitle: 'Bước 3: Đối chiếu và phê duyệt',
    description: 'Đối chiếu với các nguồn tài liệu và quyết định phê duyệt',
    sectionTitle: 'Đối chiếu và phê duyệt cuối cùng',
    notesLabel: 'Ghi chú cuối cùng',
    notesPlaceholder: 'Ghi chú cuối cùng về quá trình kiểm duyệt, các điểm đáng chú ý...',
    notesField: 'finalNotes',
    fields: [
      {
        key: 'crossChecked',
        label: 'Đã đối chiếu: Đã kiểm tra và đối chiếu với các nguồn tài liệu, cơ sở dữ liệu liên quan',
      },
      {
        key: 'sourcesVerified',
        label: 'Nguồn đã xác minh: Nguồn gốc, người thu thập, quyền sở hữu đã được xác minh',
      },
      {
        key: 'finalApproval',
        label:
          'Xác nhận phê duyệt: Tôi xác nhận đã hoàn thành tất cả các bước kiểm tra và đồng ý phê duyệt bản thu này',
      },
    ],
    optionalFields: [
      {
        key: 'sensitiveContent',
        label: 'Nội dung nhạy cảm: Đề xuất áp dụng hạn chế công bố cho bản ghi này',
      },
    ],
  },
] as const;

export type VerificationStepDefinition = (typeof VERIFICATION_STEPS)[number];
