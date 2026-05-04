import { Loader2, Send } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import { DISPUTE_DESCRIPTION_MAX_LENGTH } from '@/config/validationConstants';
import { copyrightDisputeApi } from '@/services/copyrightDisputeApi';
import { uiToast } from '@/uiToast';

export interface DisputeReportFormProps {
  recordingId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const REASON_OPTIONS = [
  { value: 'ownership', label: 'Tranh chấp quyền sở hữu' },
  { value: 'unauthorized_use', label: 'Sử dụng trái phép' },
  { value: 'plagiarism', label: 'Sao chép / đạo văn' },
  { value: 'other', label: 'Khác' },
];

function parseEvidenceUrls(multiline: string): string[] | null {
  const urls = multiline
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return urls.length > 0 ? urls : null;
}

export default function DisputeReportForm({
  recordingId,
  userId,
  onSuccess,
  onCancel,
  className,
}: DisputeReportFormProps) {
  const [reasonCode, setReasonCode] = useState('ownership');
  const [description, setDescription] = useState('');
  const [evidenceUrlsInput, setEvidenceUrlsInput] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => description.trim().length > 0, [description]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      uiToast.warning('Vui lòng mô tả nội dung báo cáo.');
      return;
    }
    setBusy(true);
    try {
      await copyrightDisputeApi.create({
        recordingId,
        reportedByUserId: userId,
        reasonCode,
        description: description.trim(),
        evidenceUrls: parseEvidenceUrls(evidenceUrlsInput),
      });
      uiToast.success('Đã gửi báo cáo tranh chấp bản quyền.');
      setDescription('');
      setEvidenceUrlsInput('');
      onSuccess?.();
    } catch (err) {
      uiToast.fromApiError(err);
    } finally {
      setBusy(false);
    }
  }, [canSubmit, description, evidenceUrlsInput, onSuccess, reasonCode, recordingId, userId]);

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm ${className ?? ''}`}>
      <h3 className="text-base font-semibold text-neutral-900">Báo cáo vi phạm bản quyền</h3>
      <p className="mt-1 text-xs text-neutral-600">
        Cung cấp thông tin tranh chấp để đội ngũ quản trị xử lý.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="dispute-reason">
            Loại tranh chấp
          </label>
          <select
            id="dispute-reason"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800"
          >
            {REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="dispute-description">
            Mô tả chi tiết
          </label>
          <textarea
            id="dispute-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={DISPUTE_DESCRIPTION_MAX_LENGTH}
            placeholder="Mô tả nguồn gốc tranh chấp, bối cảnh, tài liệu đối chiếu..."
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            {description.length}/{DISPUTE_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="dispute-evidence-urls">
            Link bằng chứng (mỗi dòng một URL, tùy chọn)
          </label>
          <textarea
            id="dispute-evidence-urls"
            value={evidenceUrlsInput}
            onChange={(e) => setEvidenceUrlsInput(e.target.value)}
            rows={3}
            placeholder="https://example.com/evidence-1&#10;https://example.com/evidence-2"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy || !canSubmit}
          variant="primary"
          size="sm"
          className="inline-flex items-center gap-1 rounded-lg text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Gửi báo cáo
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={busy}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs"
          >
            Hủy
          </Button>
        )}
      </div>
    </div>
  );
}
