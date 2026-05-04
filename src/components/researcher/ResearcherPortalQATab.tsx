import { Bot, Info, Lightbulb, Send } from 'lucide-react';
import React from 'react';

import { INTELLIGENCE_NAME } from '@/config/constants';
import { CHAT_INPUT_COUNTER_FROM, CHAT_INPUT_MAX_LENGTH } from '@/config/validationConstants';
import type { ResearcherPortalChatMessage } from '@/features/researcher/researcherPortalTypes';
import { Recording } from '@/types';

const QUICK_QUESTIONS = [
  'Đàn bầu có đặc điểm gì?',
  'So sánh nhạc cưới Tày và Thái',
  "T'rưng được chế tạo như thế nào?",
  'Hát Xoan xuất hiện khi nào?',
];

export interface ResearcherPortalQATabProps {
  chatMessages: ResearcherPortalChatMessage[];
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  isTyping: boolean;
  chatListRef: React.RefObject<HTMLDivElement>;
  onSendMessage: () => void | Promise<void>;
  onQaKeyDown: (e: React.KeyboardEvent) => void | Promise<void>;
  onQuickQuestion: (q: string) => void | Promise<void>;
  onCitationClick: (target: Recording | string) => void;
  approvedRecordings: Recording[];
}

export default function ResearcherPortalQATab({
  chatMessages,
  chatInput,
  setChatInput,
  isTyping,
  chatListRef,
  onSendMessage,
  onQaKeyDown,
  onQuickQuestion,
  onCitationClick,
  approvedRecordings,
}: ResearcherPortalQATabProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-secondary-200/50 bg-gradient-to-b from-surface-panel to-secondary-50/55 shadow-lg backdrop-blur-sm overflow-hidden min-h-[500px] max-h-[700px]">
          <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-4 sm:px-6 py-4 border-b border-primary-800">
            <h2 className="text-lg font-semibold">VietTune Intelligence</h2>
            <p className="text-secondary-200 text-sm mt-0.5">
              Hệ thống được đào tạo trên cơ sở tri thức đã xác minh
            </p>
          </div>
          <div ref={chatListRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white border border-secondary-200/50 text-neutral-700 shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 mb-1.5">
                      <Bot className="w-4 h-4" strokeWidth={2.5} />
                      {INTELLIGENCE_NAME}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-neutral-200">
                      <p className="text-[11px] font-semibold text-neutral-600 mb-1">
                        Nguồn trích dẫn tham chiếu
                      </p>
                      <ul className="space-y-1 list-none pl-0">
                        {msg.citations.map((c, cidx) => (
                          <li key={`${idx}-cite-${cidx}`}>
                            <button
                              type="button"
                              onClick={() =>
                                onCitationClick(
                                  approvedRecordings.find((x) => x.id === c.recordingId) ??
                                    c.recordingId,
                                )
                              }
                              className="text-[11px] text-left text-primary-700 hover:text-primary-900 underline underline-offset-2 cursor-pointer"
                            >
                              [{cidx + 1}] {c.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-white border border-secondary-200/50 shadow-sm flex gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-neutral-200 bg-neutral-50/80">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={onQaKeyDown}
                maxLength={CHAT_INPUT_MAX_LENGTH}
                placeholder="Hỏi về nhạc cụ, phong cách biểu diễn, lịch sử,..."
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-neutral-900 placeholder-neutral-500 bg-white"
                aria-label="Tin nhắn"
              />
              <button
                type="button"
                onClick={() => {
                  void onSendMessage();
                }}
                disabled={!chatInput.trim() || isTyping}
                className="p-2.5 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-md disabled:opacity-50 disabled:pointer-events-none text-white transition-all cursor-pointer"
                aria-label="Gửi"
              >
                <Send className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
            {chatInput.length >= CHAT_INPUT_COUNTER_FROM ? (
              <p
                className={`mt-1.5 text-right text-xs tabular-nums ${
                  chatInput.length >= CHAT_INPUT_MAX_LENGTH
                    ? 'font-semibold text-amber-800'
                    : 'text-neutral-600'
                }`}
              >
                {chatInput.length} / {CHAT_INPUT_MAX_LENGTH}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-primary-800 mb-3">
              <Lightbulb className="w-5 h-5 text-secondary-600" strokeWidth={2.5} />
              Câu hỏi gợi ý
            </h3>
            <div className="flex flex-col gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    void onQuickQuestion(q);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-200/80 text-primary-800 font-medium text-sm hover:bg-primary-100 hover:border-primary-300 transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div
            className="rounded-xl border-2 border-secondary-300 bg-gradient-to-br from-secondary-50 to-amber-50 p-4"
            style={{ borderColor: 'rgba(251, 191, 36, 0.6)' }}
          >
            <h3 className="flex items-center gap-2 text-base font-semibold text-primary-800 mb-2">
              <Info className="w-5 h-5 text-secondary-600" strokeWidth={2.5} />
              Lưu ý
            </h3>
            <ul className="text-sm text-neutral-700 space-y-1.5 list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-bold">•</span>
                Câu trả lời được tạo từ tài liệu đã xác minh
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-bold">•</span>
                Kèm theo nguồn trích dẫn học thuật
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 font-bold">•</span>
                Chuyên gia có thể giám sát và điều chỉnh
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
