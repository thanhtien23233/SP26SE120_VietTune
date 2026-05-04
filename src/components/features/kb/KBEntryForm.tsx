import { useMemo, useState } from 'react';

import KBCitationManager from './KBCitationManager';
import KBRichTextEditor from './KBRichTextEditor';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import {
  KB_CITATION_TEXT_MAX_LENGTH,
  KB_CITATION_URL_MAX_LENGTH,
  KB_ENTRY_REVISION_NOTE_MAX_LENGTH,
  KB_ENTRY_TITLE_MAX_LENGTH,
} from '@/config/validationConstants';
import type {
  CreateKBCitationRequest,
  CreateKBEntryRequest,
  UpdateKBEntryRequest,
} from '@/types/knowledgeBase';
import { KB_CATEGORY_LABELS, KB_CATEGORIES } from '@/types/knowledgeBase';
import { filterValidCitations } from '@/utils/kbCitations';

function stripHtmlToText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '').trim();
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').trim();
}

export interface KBEntryFormProps {
  mode: 'create' | 'edit';
  initialTitle?: string;
  initialCategory?: string;
  initialContent?: string;
  initialRevisionNote?: string;
  initialCitations?: CreateKBCitationRequest[];
  showCitations?: boolean;
  isSubmitting?: boolean;
  onSubmitCreate?: (payload: CreateKBEntryRequest) => void | Promise<void>;
  onSubmitUpdate?: (payload: UpdateKBEntryRequest) => void | Promise<void>;
  onContentChange?: (content: string) => void;
  onCancel?: () => void;
}

export default function KBEntryForm({
  mode,
  initialTitle = '',
  initialCategory = 'general',
  initialContent = '',
  initialRevisionNote = '',
  initialCitations = [],
  showCitations = true,
  isSubmitting = false,
  onSubmitCreate,
  onSubmitUpdate,
  onContentChange,
  onCancel,
}: KBEntryFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);
  const [content, setContent] = useState(initialContent);
  const [revisionNote, setRevisionNote] = useState(initialRevisionNote);
  const [citations, setCitations] = useState<CreateKBCitationRequest[]>(
    initialCitations.length ? initialCitations : [],
  );

  const [errors, setErrors] = useState<{
    title?: string;
    category?: string;
    content?: string;
    revisionNote?: string;
    citations?: string;
  }>({});

  const categoryOptions = useMemo(
    () => KB_CATEGORIES.map((c) => ({ value: c, label: KB_CATEGORY_LABELS[c] ?? c })),
    [],
  );

  const validate = (): boolean => {
    const next: typeof errors = {};
    const t = title.trim();
    if (!t) next.title = 'Bắt buộc';
    else if (t.length > KB_ENTRY_TITLE_MAX_LENGTH)
      next.title = `Tối đa ${KB_ENTRY_TITLE_MAX_LENGTH} ký tự`;
    if (!category.trim()) next.category = 'Chọn danh mục';
    const plain = stripHtmlToText(content);
    if (!plain) next.content = 'Nội dung không được để trống';
    if (mode === 'edit' && revisionNote.length > KB_ENTRY_REVISION_NOTE_MAX_LENGTH)
      next.revisionNote = `Tối đa ${KB_ENTRY_REVISION_NOTE_MAX_LENGTH} ký tự`;
    if (mode === 'create' && showCitations) {
      for (const c of citations) {
        const ct = c.citation.trim();
        if (ct.length > KB_CITATION_TEXT_MAX_LENGTH) {
          next.citations = `Một trích dẫn vượt quá ${KB_CITATION_TEXT_MAX_LENGTH} ký tự`;
          break;
        }
        const u = c.url?.trim() ?? '';
        if (u.length > KB_CITATION_URL_MAX_LENGTH) {
          next.citations = `Một URL vượt quá ${KB_CITATION_URL_MAX_LENGTH} ký tự`;
          break;
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContentChange = (next: string) => {
    setContent(next);
    onContentChange?.(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (mode === 'create' && onSubmitCreate) {
      const payload: CreateKBEntryRequest = {
        title: title.trim(),
        content,
        category: category.trim(),
        citations:
          showCitations && citations.length > 0 ? filterValidCitations(citations) : undefined,
      };
      if (!payload.citations?.length) payload.citations = undefined;
      void onSubmitCreate(payload);
      return;
    }

    if (mode === 'edit' && onSubmitUpdate) {
      const payload: UpdateKBEntryRequest = {
        title: title.trim(),
        content,
        category: category.trim() || null,
        revisionNote: revisionNote.trim() || null,
      };
      void onSubmitUpdate(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Tiêu đề"
        required
        maxLength={KB_ENTRY_TITLE_MAX_LENGTH}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSubmitting}
        error={errors.title}
        placeholder="Tiêu đề bài viết KB"
      />

      <div className="w-full">
        <label
          htmlFor="kb-entry-category"
          className="mb-0.5 block text-xs font-medium text-neutral-700"
        >
          Danh mục<span className="ml-1 text-primary-600">*</span>
        </label>
        <select
          id="kb-entry-category"
          className="w-full rounded-full border border-neutral-400/80 bg-surface-panel px-5 py-3 text-sm font-medium text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none disabled:opacity-60"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isSubmitting}
        >
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-0.5 text-xs text-primary-600">{errors.category}</p>}
      </div>

      <KBRichTextEditor
        id="kb-content"
        label="Nội dung"
        value={content}
        onChange={handleContentChange}
        disabled={isSubmitting}
        error={errors.content}
      />

      {mode === 'edit' && (
        <Input
          label="Ghi chú phiên bản (tùy chọn)"
          maxLength={KB_ENTRY_REVISION_NOTE_MAX_LENGTH}
          value={revisionNote}
          onChange={(e) => setRevisionNote(e.target.value)}
          disabled={isSubmitting}
          error={errors.revisionNote}
          helperText="Lưu cùng lần cập nhật nội dung (revision)"
        />
      )}

      {showCitations && mode === 'create' && (
        <div>
          {errors.citations && (
            <p className="mb-2 text-xs text-primary-600">{errors.citations}</p>
          )}
          <KBCitationManager value={citations} onChange={setCitations} disabled={isSubmitting} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
          {mode === 'create' ? 'Tạo bài viết' : 'Lưu thay đổi'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
