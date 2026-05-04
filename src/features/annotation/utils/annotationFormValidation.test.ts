import { describe, expect, it } from 'vitest';

import {
  ANNOTATION_MAX_CITATION_LENGTH,
  ANNOTATION_MAX_CONTENT_LENGTH,
  DEFAULT_ANNOTATION_FORM,
  validateAnnotationForm,
} from './annotationFormValidation';

describe('annotationFormValidation', () => {
  describe('validateAnnotationForm', () => {
    it('accepts minimal valid payload', () => {
      const form = {
        ...DEFAULT_ANNOTATION_FORM,
        content: 'Nội dung hợp lệ',
      };
      const r = validateAnnotationForm(form);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.payload.content).toBe('Nội dung hợp lệ');
        expect(r.payload.researchCitation).toBeNull();
        expect(r.payload.timestampStart).toBeNull();
        expect(r.payload.timestampEnd).toBeNull();
      }
    });

    it('rejects empty content', () => {
      const r = validateAnnotationForm({ ...DEFAULT_ANNOTATION_FORM, content: '   ' });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errors.content).toBe('Nội dung là bắt buộc.');
      }
    });

    it('rejects content longer than max', () => {
      const form = {
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x'.repeat(ANNOTATION_MAX_CONTENT_LENGTH + 1),
      };
      const r = validateAnnotationForm(form);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errors.content).toContain(String(ANNOTATION_MAX_CONTENT_LENGTH));
        expect(r.errors.researchCitation).toBeUndefined();
      }
    });

    /**
     * BUG-1 regression: citation length must surface on researchCitation, not content.
     */
    it('puts overlong citation error on researchCitation only', () => {
      const form = {
        ...DEFAULT_ANNOTATION_FORM,
        content: 'ok',
        researchCitation: 'c'.repeat(ANNOTATION_MAX_CITATION_LENGTH + 1),
      };
      const r = validateAnnotationForm(form);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errors.researchCitation).toContain(String(ANNOTATION_MAX_CITATION_LENGTH));
        expect(r.errors.content).toBeUndefined();
      }
    });

    it('rejects invalid optional timestamps', () => {
      const r = validateAnnotationForm({
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x',
        timestampStart: '1.5',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errors.timestampStart).toBeDefined();
      }
    });

    it('rejects end before start when both set', () => {
      const r = validateAnnotationForm({
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x',
        timestampStart: '10',
        timestampEnd: '5',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errors.timestampEnd).toBeDefined();
      }
    });

    it('accepts end equal to start', () => {
      const r = validateAnnotationForm({
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x',
        timestampStart: '10',
        timestampEnd: '10',
      });
      expect(r.ok).toBe(true);
    });

    it('accepts plain-text research citation (no URL)', () => {
      const r = validateAnnotationForm({
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x',
        researchCitation: 'Smith (2020), tr. 12',
      });
      expect(r.ok).toBe(true);
    });

    it('accepts valid http(s) URL in research citation', () => {
      const r = validateAnnotationForm({
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x',
        researchCitation: 'https://example.com/path',
      });
      expect(r.ok).toBe(true);
    });

    it('rejects malformed URL when citation starts with http(s)', () => {
      const r = validateAnnotationForm({
        ...DEFAULT_ANNOTATION_FORM,
        content: 'x',
        researchCitation: 'http://',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errors.researchCitation).toBeDefined();
      }
    });
  });
});
