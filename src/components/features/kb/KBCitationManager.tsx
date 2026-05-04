import { Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { KB_CITATION_TEXT_MAX_LENGTH, KB_CITATION_URL_MAX_LENGTH } from '@/config/validationConstants';
import type { CreateKBCitationRequest } from '@/types/knowledgeBase';
import { isLikelyHttpUrl } from '@/utils/annotationHelpers';

export interface KBCitationManagerProps {
  value: CreateKBCitationRequest[];
  onChange: (next: CreateKBCitationRequest[]) => void;
  disabled?: boolean;
}

function validateCitation(c: CreateKBCitationRequest): { citation?: string; url?: string } {
  const errors: { citation?: string; url?: string } = {};
  const t = c.citation.trim();
  if (t.length < 1) errors.citation = `Bắt buộc (1–${KB_CITATION_TEXT_MAX_LENGTH} ký tự)`;
  else if (t.length > KB_CITATION_TEXT_MAX_LENGTH)
    errors.citation = `Tối đa ${KB_CITATION_TEXT_MAX_LENGTH} ký tự`;
  const urlTrimmed = (c.url ?? '').trim();
  if (urlTrimmed.length > 0) {
    if (urlTrimmed.length > KB_CITATION_URL_MAX_LENGTH)
      errors.url = `Tối đa ${KB_CITATION_URL_MAX_LENGTH} ký tự`;
    else if (!isLikelyHttpUrl(urlTrimmed)) {
      errors.url = 'URL phải bắt đầu bằng http:// hoặc https://';
    }
  }
  return errors;
}

export default function KBCitationManager({
  value,
  onChange,
  disabled = false,
}: KBCitationManagerProps) {
  const updateAt = useCallback(
    (index: number, patch: Partial<CreateKBCitationRequest>) => {
      const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
      onChange(next);
    },
    [value, onChange],
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const addRow = useCallback(() => {
    onChange([...value, { citation: '', url: '' }]);
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-700">Trích dẫn (tùy chọn)</p>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
          <Plus className="mr-1 inline h-3.5 w-3.5" />
          Thêm trích dẫn
        </Button>
      </div>
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-secondary-200/80 bg-cream-50/80 px-3 py-2 text-xs text-neutral-500">
          Chưa có trích dẫn. Có thể thêm nguồn hoặc ghi chú tham khảo.
        </p>
      )}
      <ul className="space-y-3">
        {value.map((row, index) => {
          const err = validateCitation(row);
          return (
            <li
              key={index}
              className="rounded-2xl border border-secondary-200/70 bg-surface-panel p-3 shadow-sm"
            >
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  disabled={disabled}
                  title="Xóa dòng"
                  onClick={() => removeAt(index)}
                  className="rounded-full p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                label="Nội dung trích dẫn"
                required
                disabled={disabled}
                maxLength={KB_CITATION_TEXT_MAX_LENGTH}
                value={row.citation}
                onChange={(e) => updateAt(index, { citation: e.target.value })}
                placeholder="Ví dụ: Theo sách X, trang 12…"
                error={err.citation}
              />
              <div className="mt-2">
                <Input
                  label="URL (tùy chọn)"
                  disabled={disabled}
                  maxLength={KB_CITATION_URL_MAX_LENGTH}
                  value={row.url ?? ''}
                  onChange={(e) => updateAt(index, { url: e.target.value || null })}
                  placeholder="https://…"
                  error={err.url}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
