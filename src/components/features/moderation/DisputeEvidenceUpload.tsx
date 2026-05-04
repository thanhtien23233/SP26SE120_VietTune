import { Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';

import { DISPUTE_EVIDENCE_MAX_BYTES } from '@/config/validationConstants';
import { formatFileSize } from '@/features/upload/uploadConstants';
import { copyrightDisputeApi } from '@/services/copyrightDisputeApi';
import { uiToast } from '@/uiToast';

function validateEvidenceFile(file: File): string | null {
  if (file.size > DISPUTE_EVIDENCE_MAX_BYTES) {
    return `Tệp vượt quá ${formatFileSize(DISPUTE_EVIDENCE_MAX_BYTES)} (hiện tại: ${formatFileSize(file.size)}).`;
  }
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extOk = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);
  const mimeOk = mime === 'application/pdf' || mime.startsWith('image/');
  if (mimeOk || extOk) return null;
  return 'Chỉ chấp nhận ảnh (JPEG, PNG, GIF, WebP) hoặc PDF.';
}

export interface DisputeEvidenceUploadProps {
  disputeId: string;
  onSuccess?: () => void;
  className?: string;
}

export default function DisputeEvidenceUpload({
  disputeId,
  onSuccess,
  className,
}: DisputeEvidenceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    const err = validateEvidenceFile(selected);
    if (err) {
      setFile(null);
      setFileError(err);
      e.target.value = '';
      return;
    }
    setFileError(null);
    setFile(selected);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setFileError('Vui lòng chọn tệp bằng chứng.');
      return;
    }
    const err = validateEvidenceFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setBusy(true);
    try {
      await copyrightDisputeApi.uploadEvidence(disputeId, file);
      uiToast.success('Đã tải lên bằng chứng.');
      setFile(null);
      setFileError(null);
      onSuccess?.();
    } catch (err) {
      uiToast.fromApiError(err);
    } finally {
      setBusy(false);
    }
  }, [disputeId, file, onSuccess]);

  return (
    <div className={`rounded-lg border border-neutral-200 bg-neutral-50 p-3 ${className ?? ''}`}>
      <label className="mb-2 block text-xs font-semibold text-neutral-700" htmlFor={`evidence-${disputeId}`}>
        Tải lên bằng chứng
      </label>
      <input
        id={`evidence-${disputeId}`}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="mb-2 block w-full text-xs text-neutral-700"
        aria-invalid={fileError ? true : undefined}
        aria-describedby={fileError ? `evidence-${disputeId}-error` : undefined}
      />
      {fileError ? (
        <p id={`evidence-${disputeId}-error`} className="mb-2 text-xs text-red-700" role="alert">
          {fileError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={busy || !file}
        className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Tải lên
      </button>
    </div>
  );
}
