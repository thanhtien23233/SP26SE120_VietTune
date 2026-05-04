/**
 * Client-side validation limits shared across forms (text lengths, file byte caps).
 * Upload MIME lists stay in `uploadConstants.ts`; size caps are defined here and re-exported there.
 */

/** Contributor audio upload (defense in depth; backend may enforce separately). */
export const MAX_AUDIO_UPLOAD_BYTES = 200 * 1024 * 1024;

/** Contributor video upload. */
export const MAX_VIDEO_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/** Chatbot + Researcher QA input. */
export const CHAT_INPUT_MAX_LENGTH = 2000;

/** Show character counter when at or above this length. */
export const CHAT_INPUT_COUNTER_FROM = 1800;

/** Expert annotation panel. */
export const ANNOTATION_MAX_CONTENT_LENGTH = 2000;
export const ANNOTATION_MAX_CITATION_LENGTH = 1000;

/** Moderation: reject dialog, approve notes, expert review textareas. */
export const MODERATION_REJECT_REASON_MAX_LENGTH = 2000;
export const MODERATION_APPROVE_EXPERT_NOTES_MAX_LENGTH = 1000;
export const MODERATION_EXPERT_TEXTAREA_MAX_LENGTH = 2000;

/** Copyright dispute reporter + admin resolution. */
export const DISPUTE_DESCRIPTION_MAX_LENGTH = 2000;
export const DISPUTE_RESOLUTION_NOTES_MAX_LENGTH = 1000;
export const DISPUTE_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

/** Knowledge base entry + citation rows. */
export const KB_CITATION_TEXT_MAX_LENGTH = 1000;
export const KB_CITATION_URL_MAX_LENGTH = 500;
export const KB_ENTRY_TITLE_MAX_LENGTH = 500;
export const KB_ENTRY_REVISION_NOTE_MAX_LENGTH = 500;

/** Expert correction on flagged AI responses. */
export const AI_EXPERT_CORRECTION_MAX_LENGTH = 2000;

/** Embargo reason textarea. */
export const EMBARGO_REASON_MAX_LENGTH = 500;
