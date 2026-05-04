import { History, ChevronLeft, Menu, Plus } from 'lucide-react';

import { QAConversationRequest } from '@/services/qaConversationService';

interface ChatSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  history: QAConversationRequest[];
  isLoadingHistory: boolean;
  conversationId: string;
  onSelectConversation: (conv: QAConversationRequest) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  history,
  isLoadingHistory,
  conversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div
      className={`transition-all duration-300 ease-in-out flex flex-col rounded-2xl flex-shrink-0 relative ${
        isSidebarOpen
          ? 'w-64 sm:w-80 bg-white shadow-lg border-2 border-primary-200/80'
          : 'w-0 lg:w-16 border-0 lg:border-2 lg:border-transparent bg-transparent'
      }`}
    >
      {/* Header / Toggle Button Area */}
      <div
        className={`flex items-center px-2 sm:px-3 py-3 ${
          isSidebarOpen
            ? 'justify-between bg-primary-50 rounded-t-2xl border-b-2 border-primary-200/80'
            : 'hidden lg:flex justify-center'
        }`}
      >
        {/* Title when open */}
        <div
          className={`flex flex-1 items-center overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600 flex-shrink-0" />
            <h3 className="font-semibold text-primary-800 whitespace-nowrap">Lịch sử</h3>
          </div>
          {isSidebarOpen && (
            <button
              onClick={onNewChat}
              className="ml-auto mr-2 p-1.5 bg-primary-100/60 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors flex items-center justify-center"
              title="Tạo cuộc trò chuyện mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle Button for Desktop - Always visible on desktop */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`hidden lg:flex p-2 rounded-xl text-primary-600 cursor-pointer flex-shrink-0 transition-colors ${
            !isSidebarOpen
              ? 'bg-primary-50 shadow-md border border-primary-200/80 hover:bg-primary-100'
              : 'hover:bg-primary-100'
          }`}
          title={isSidebarOpen ? 'Đóng lịch sử' : 'Mở lịch sử'}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Toggle Button for Mobile - Only visible inside when open */}
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-primary-100 rounded-xl text-primary-600 cursor-pointer flex-shrink-0 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 flex flex-col gap-2 transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden lg:hidden'
        }`}
      >
        {isLoadingHistory ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-neutral-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm italic whitespace-nowrap">
            Chưa có lịch sử lưu trữ.
          </div>
        ) : (
          history.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full text-left p-3 rounded-xl transition-all border-2 shadow-sm mb-2 ${
                conversationId === conv.id
                  ? 'bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100'
                  : 'bg-white border-neutral-200 hover:border-primary-200 hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <p className="font-medium text-sm truncate">{conv.title || 'Cuộc trò chuyện mới'}</p>
              <p className="text-[10px] text-neutral-500 mt-1">
                {new Date(conv.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
