import { Bot, BookOpen, Music, CheckCircle2, Flag } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { INTELLIGENCE_NAME } from '@/config/constants';
import { Message } from '@/types/chat';

interface ChatMessageItemProps {
  message: Message;
  onToggleFlag?: (messageId: string, currentFlagged: boolean) => void;
}

function parseKbEntryIds(json: string | null | undefined): string[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim()) {
        ids.push(item.trim());
      } else if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id?: unknown }).id;
        if (typeof id === 'string' && id.trim()) ids.push(id.trim());
      }
    }
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

function ChatMessageItem({ message, onToggleFlag }: ChatMessageItemProps) {
  const sources = useMemo(() => {
    let recordings: string[] = [];
    try {
      if (message.sourceRecordingIdsJson) {
        recordings = JSON.parse(message.sourceRecordingIdsJson);
      }
    } catch {
      // ignore
    }
    const kbEntries = parseKbEntryIds(message.sourceKBEntryIdsJson);
    return { recordings, kbEntries };
  }, [message.sourceRecordingIdsJson, message.sourceKBEntryIdsJson]);

  const hasSources = sources.recordings.length > 0 || sources.kbEntries.length > 0;

  return (
    <div
      className={`flex w-full mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
          message.role === 'user'
            ? 'bg-primary-600 text-white shadow-md rounded-tr-sm'
            : 'bg-white border text-neutral-700 shadow-sm rounded-tl-sm ' +
              (message.expertCorrection
                ? 'border-amber-300 bg-amber-50/30'
                : 'border-secondary-200/80')
        }`}
      >
        {message.role === 'assistant' && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600">
              <Bot className="w-4 h-4" strokeWidth={2.5} />
              {INTELLIGENCE_NAME}
            </div>
            {message.id !== 'welcome' && (
              <button
                onClick={() => onToggleFlag?.(message.id, !!message.flaggedByExpert)}
                className={`p-1.5 rounded-md transition-colors ${
                  message.flaggedByExpert
                    ? 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-200'
                    : 'text-neutral-400 hover:text-red-500 hover:bg-neutral-100'
                }`}
                title={
                  message.flaggedByExpert ? 'Bỏ đánh dấu báo cáo' : 'Báo cáo câu trả lời chưa đúng'
                }
              >
                <Flag className="w-4 h-4" strokeWidth={message.flaggedByExpert ? 2.5 : 1.5} />
              </button>
            )}
          </div>
        )}

        {/* Nội dung tin nhắn chính */}
        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? '' : 'text-neutral-800'}`}
        >
          {message.role === 'user'
            ? message.content
            : message.content.split('**').map((part, i) =>
                i % 2 === 1 ? (
                  <strong key={i} className="font-semibold text-neutral-900">
                    {part}
                  </strong>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
        </div>

        {/* Nguồn trích dẫn (Chỉ hiển thị cho AI message) */}
        {message.role === 'assistant' && hasSources && !message.expertCorrection && (
          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap gap-2">
            {sources.recordings.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary-50 text-secondary-700 rounded-lg text-[11px] font-medium border border-secondary-100">
                <Music className="w-3 h-3" />
                <span>{sources.recordings.length} Bản ghi âm</span>
              </div>
            )}
            {sources.kbEntries.length > 0 && (
              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-[11px] font-medium border border-primary-100 w-fit">
                  <BookOpen className="w-3 h-3" />
                  <span>{sources.kbEntries.length} Tài liệu tham khảo</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sources.kbEntries.map((entryId, idx) => (
                    <Link
                      key={entryId}
                      to={`/kb/entry/${encodeURIComponent(entryId)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-white px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                    >
                      <BookOpen className="w-3 h-3 shrink-0" />
                      {sources.kbEntries.length > 1 ? `Tài liệu ${idx + 1}` : 'Mở tài liệu'}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expert Correction Banner */}
        {message.role === 'assistant' && message.expertCorrection && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1 tracking-wide uppercase">
                  Cập nhật bởi chuyên gia
                </p>
                <div className="text-sm text-amber-900 leading-relaxed italic border-l-2 border-amber-300 pl-2">
                  "{message.expertCorrection}"
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessageItem);
