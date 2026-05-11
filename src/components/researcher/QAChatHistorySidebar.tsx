import { ChevronLeft, History, Menu, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatViDateTimeShortBangkok } from '@/config/datetimeDisplay';
import type { QAConversationRequest } from '@/services/qaConversationService';

interface QAChatHistorySidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  history: QAConversationRequest[];
  isLoadingHistory: boolean;
  conversationId: string;
  onSelectConversation: (conv: QAConversationRequest) => void;
  onNewChat: () => void;
}

export default function QAChatHistorySidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  history,
  isLoadingHistory,
  conversationId,
  onSelectConversation,
  onNewChat,
}: QAChatHistorySidebarProps) {
  const [query, setQuery] = useState('');

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return history;
    return history.filter((conv) =>
      (conv.title || 'Cuộc trò chuyện mới').toLowerCase().includes(normalizedQuery),
    );
  }, [history, query]);

  return (
    <div
      className={`transition-all duration-300 ease-in-out flex flex-col rounded-2xl flex-shrink-0 relative min-h-[500px] max-h-[700px] ${
        isSidebarOpen
          ? 'w-full lg:w-72 bg-white shadow-lg border-2 border-primary-200/80'
          : 'w-0 lg:w-14 border-0 lg:border-2 lg:border-transparent bg-transparent'
      }`}
    >
      <div
        className={`flex items-center px-2 sm:px-3 py-3 ${
          isSidebarOpen
            ? 'justify-between bg-primary-50 rounded-t-2xl border-b-2 border-primary-200/80'
            : 'hidden lg:flex justify-center'
        }`}
      >
        <div
          className={`flex flex-1 items-center overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600 flex-shrink-0" strokeWidth={2.5} />
            <h3 className="font-semibold text-primary-800 whitespace-nowrap">Lịch sử</h3>
          </div>
          {isSidebarOpen && (
            <button
              type="button"
              onClick={onNewChat}
              className="ml-auto mr-2 p-1.5 bg-primary-100/60 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              title="Tạo cuộc trò chuyện mới"
              aria-label="Tạo cuộc trò chuyện mới"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`hidden lg:flex p-2 rounded-xl text-primary-600 cursor-pointer flex-shrink-0 transition-colors ${
            !isSidebarOpen
              ? 'bg-primary-50 shadow-md border border-primary-200/80 hover:bg-primary-100'
              : 'hover:bg-primary-100'
          }`}
          title={isSidebarOpen ? 'Đóng lịch sử' : 'Mở lịch sử'}
          aria-label={isSidebarOpen ? 'Đóng lịch sử' : 'Mở lịch sử'}
        >
          <Menu className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-primary-100 rounded-xl text-primary-600 cursor-pointer flex-shrink-0 transition-colors"
            aria-label="Đóng lịch sử"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div
        className={`flex-1 overflow-hidden p-4 flex flex-col gap-3 transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden lg:hidden'
        }`}
      >
        <label className="relative block">
          <span className="sr-only">Tìm kiếm lịch sử</span>
          <Search
            className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={2.5}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm lịch sử..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm text-neutral-900 placeholder-neutral-500 bg-white"
          />
        </label>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {isLoadingHistory ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-neutral-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm italic text-center">
              Chưa có lịch sử lưu trữ.
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm italic text-center">
              Không tìm thấy cuộc trò chuyện phù hợp.
            </div>
          ) : (
            filteredHistory.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3 rounded-xl transition-all border-2 shadow-sm ${
                  conversationId === conv.id
                    ? 'bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100'
                    : 'bg-white border-neutral-200 hover:border-primary-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <p className="font-medium text-sm truncate">{conv.title || 'Cuộc trò chuyện mới'}</p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  {formatViDateTimeShortBangkok(conv.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
