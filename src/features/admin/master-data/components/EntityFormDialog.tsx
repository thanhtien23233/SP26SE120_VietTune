import { clsx } from 'clsx';
import { X, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { EntityKind, ReferenceEntity, EntityFormValues } from '../types/masterDataTypes';
import { isDuplicateName } from '../utils/duplicateDetector';
import { entityConfigs } from '../utils/entityFieldConfig';
import { normalizeSlug } from '../utils/slugNormalizer';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';


interface EntityFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EntityFormValues) => Promise<boolean>;
  kind: EntityKind;
  entity: ReferenceEntity<Record<string, unknown>> | null;
  existingItems: { id: string; name: string }[];
}

export function EntityFormDialog({
  isOpen,
  onClose,
  onSave,
  kind,
  entity,
  existingItems,
}: EntityFormDialogProps) {
  const config = entityConfigs[kind];
  const isEdit = !!entity;

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && entity) {
        setFormData({ ...(entity.raw as Record<string, string>) });
      } else {
        setFormData({});
      }
      setErrors({});
      setDuplicateWarning(false);
    }
  }, [isOpen, isEdit, entity]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    if (name === 'name') {
      const isDup = isDuplicateName(value, existingItems, entity?.id);
      setDuplicateWarning(isDup);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    config.fields.forEach((field) => {
      const val = formData[field.name];
      if (field.required && (!val || val.trim() === '')) {
        newErrors[field.name] = 'Trường này là bắt buộc';
      }
      if (field.maxLength && val && val.length > field.maxLength) {
        newErrors[field.name] = `Tối đa ${field.maxLength} ký tự`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await onSave(formData as EntityFormValues);
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full sm:max-w-xl bg-surface-panel sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-neutral-200/60"
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 id="dialog-title" className="text-lg font-bold text-neutral-800">
            {isEdit ? 'Cập nhật' : 'Thêm mới'} {config.singularName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors duration-200"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isEdit && !entity?.isActive && (
            <div className="p-3 bg-secondary-50 text-secondary-800 rounded-xl flex items-start gap-2.5 text-sm border border-secondary-200/50">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-secondary-600" />
              <span>Dữ liệu này đang bị tạm ẩn. Thay đổi sẽ không xuất hiện cho đến khi được kích hoạt lại.</span>
            </div>
          )}

          {config.fields.map((field) => {
            const hasError = !!errors[field.name];
            return (
              <div key={field.name} className="space-y-1.5">
                <label htmlFor={`field-${field.name}`} className="block text-sm font-semibold text-neutral-700">
                  {field.label}
                  {field.required && <span className="text-primary-500 ml-0.5" aria-hidden="true">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={`field-${field.name}`}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className={clsx(
                      'flex min-h-[100px] w-full rounded-xl border bg-cream-50 px-3.5 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                      'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
                      hasError ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-neutral-200/80'
                    )}
                  />
                ) : (
                  <Input
                    id={`field-${field.name}`}
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className={clsx(
                      'rounded-xl border-neutral-200/80 bg-cream-50 focus:border-primary-500 shadow-none ring-0 focus:ring-2 focus:ring-primary-500/20',
                      hasError && 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                    )}
                    aria-invalid={hasError}
                  />
                )}

                {hasError && <p className="text-xs text-red-500 font-medium">{errors[field.name]}</p>}

                {field.name === 'name' && formData.name && !hasError && (
                  <div className="text-xs text-neutral-400 mt-1 flex justify-between">
                    <span>Slug: <code className="text-neutral-500">{normalizeSlug(formData.name)}</code></span>
                    {duplicateWarning && (
                      <span className="text-secondary-600 font-semibold">
                        ⚠ Tên này có thể đã tồn tại
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="!px-4 !py-2 !rounded-xl !text-sm">
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="!px-5 !py-2 !rounded-xl !text-sm !shadow-md !shadow-primary-600/20"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
