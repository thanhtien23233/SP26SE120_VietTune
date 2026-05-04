import { Send, History } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import BackButton from '@/components/common/BackButton';
import ChatMessageItem from '@/components/features/chatbot/ChatMessageItem';
import ChatSidebar from '@/components/features/chatbot/ChatSidebar';
import { INTELLIGENCE_NAME } from '@/config/constants';
import { CHAT_INPUT_COUNTER_FROM, CHAT_INPUT_MAX_LENGTH } from '@/config/validationConstants';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbotSession } from '@/hooks/useChatbotSession';
import { createQAConversation, type QAConversationRequest } from '@/services/qaConversationService';
import {
  createQAMessage,
  fetchConversationMessages,
  flagMessage,
  unflagMessage,
} from '@/services/qaMessageService';
import { sendResearcherChatMessage } from '@/services/researcherChatService';
import { Message } from '@/types/chat';

/** Tin chào — đồng bộ với tab Hỏi Đáp AI (ResearcherPortalPage). */
const WELCOME_MESSAGE =
  'Xin chào! Tôi có thể giúp bạn tìm hiểu về âm nhạc truyền thống Việt Nam. Bạn muốn tìm hiểu về điều gì?';

/** Fallback khi API lỗi hoặc không trả về nội dung. */
const FALLBACK_REPLY =
  'Xin lỗi, tôi chưa thể trả lời. Vui lòng kiểm tra kết nối backend (VietTune API + Gemini) và thử lại.';

export default function ChatbotPage() {
  const { user } = useAuth();
  const { history, isLoadingHistory, loadHistory } = useChatbotSession(user?.id);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [isFirstMessage, setIsFirstMessage] = useState<boolean>(true);
  const [chatTitle, setChatTitle] = useState('Cuộc trò chuyện mới');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const handleToggleFlag = async (msgId: string, currentFlagged: boolean) => {
    try {
      if (currentFlagged) {
        await unflagMessage(msgId);
      } else {
        await flagMessage(msgId);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, flaggedByExpert: !currentFlagged } : m)),
      );
    } catch (error) {
      console.error('Lỗi khi cắm cờ:', error);
    }
  };

  const handleSelectConversation = async (conv: QAConversationRequest) => {
    setConversationId(conv.id);
    setIsFirstMessage(false);
    setChatTitle(conv.title || 'Cuộc trò chuyện mới');
    setIsLoadingMessages(true);

    // Khởi tạo trạng thái rỗng trong lúc chờ
    setMessages([]);

    const remoteMsgs = await fetchConversationMessages(conv.id);
    if (remoteMsgs && remoteMsgs.length > 0) {
      const mapped: Message[] = remoteMsgs.map((m) => ({
        id: m.id,
        role: m.role === 0 ? 'user' : 'assistant',
        content: m.content,
        timestamp: new Date(m.createdAt),
        sourceRecordingIdsJson: m.sourceRecordingIdsJson,
        sourceKBEntryIdsJson: m.sourceKBEntryIdsJson,
        expertCorrection: m.expertCorrection,
        flaggedByExpert: m.flaggedByExpert,
      }));
      setMessages(mapped);
    }

    setIsLoadingMessages(false);
    // On mobile, close sidebar after selecting
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setConversationId(crypto.randomUUID());
    setIsFirstMessage(true);
    setChatTitle('Cuộc trò chuyện mới');
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    setInput('');
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsgId = crypto.randomUUID();
    const userTimestamp = new Date();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      if (isFirstMessage) {
        setChatTitle(text);
        await createQAConversation({
          id: conversationId,
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
          title: text,
          createdAt: userTimestamp.toISOString(),
        });
        setIsFirstMessage(false);
        void loadHistory(); // Refresh history list
      }

      await createQAMessage({
        id: userMsgId,
        conversationId: conversationId,
        role: 0,
        content: text,
        sourceRecordingIdsJson: '[]',
        sourceKBEntryIdsJson: '[]',
        confidenceScore: 0,
        flaggedByExpert: false,
        correctedByExpertId: null,
        expertCorrection: null,
        createdAt: userTimestamp.toISOString(),
      });

      const reply = await sendResearcherChatMessage(text);
      const content = reply?.trim() || FALLBACK_REPLY;
      const botMsgId = crypto.randomUUID();
      const botTimestamp = new Date();
      const botMsg: Message = {
        id: botMsgId,
        role: 'assistant',
        content,
        timestamp: botTimestamp,
      };

      setMessages((prev) => [...prev, botMsg]);

      await createQAMessage({
        id: botMsgId,
        conversationId: conversationId,
        role: 1,
        content: content,
        sourceRecordingIdsJson: '[]',
        sourceKBEntryIdsJson: '[]',
        confidenceScore: 0,
        flaggedByExpert: false,
        correctedByExpertId: null,
        expertCorrection: null,
        createdAt: botTimestamp.toISOString(),
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: FALLBACK_REPLY,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            {INTELLIGENCE_NAME}
          </h1>
          <BackButton />
        </div>

        {/* Chat Layout with Sidebar */}
        <div className="flex gap-4 sm:gap-6 h-[700px] relative w-full overflow-hidden">
          <ChatSidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            history={history}
            isLoadingHistory={isLoadingHistory}
            conversationId={conversationId}
            onSelectConversation={(conv) => void handleSelectConversation(conv)}
            onNewChat={handleNewChat}
          />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col rounded-2xl border-2 border-primary-200/80 bg-white shadow-lg overflow-hidden transition-all duration-300 min-w-0">
            <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-4 sm:px-6 py-4 border-b-2 border-primary-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                    {chatTitle}
                  </h2>
                  <p className="text-secondary-200 text-sm mt-0.5 truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                    {INTELLIGENCE_NAME}
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto bg-gradient-to-br from-surface-panel to-[#FFF1F3] p-4 space-y-4"
            >
              {isLoadingMessages ? (
                <div className="flex justify-center h-full items-center text-neutral-500 font-medium">
                  Đang tải tin nhắn...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-neutral-500 italic text-sm">
                  Không có tin nhắn nào.
                </div>
              ) : (
                messages.map((m) => (
                  <ChatMessageItem key={m.id} message={m} onToggleFlag={handleToggleFlag} />
                ))
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-white border-2 border-secondary-200/80 shadow-sm flex gap-1.5">
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
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={CHAT_INPUT_MAX_LENGTH}
                  placeholder="Hỏi về nhạc cụ, phong cách biểu diễn, lịch sử,..."
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border-2 border-primary-200/80 focus:border-primary-500 outline-none text-neutral-900 placeholder-neutral-500"
                  aria-label="Tin nhắn"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none text-white transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Gửi"
                >
                  <Send className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>
              {input.length >= CHAT_INPUT_COUNTER_FROM ? (
                <p
                  className={`mt-1.5 text-right text-xs tabular-nums ${
                    input.length >= CHAT_INPUT_MAX_LENGTH ? 'font-semibold text-amber-800' : 'text-neutral-600'
                  }`}
                >
                  {input.length} / {CHAT_INPUT_MAX_LENGTH}
                </p>
              ) : null}
            </div>
          </div>

          {/* Mobile Overlay button when sidebar is closed */}
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden absolute bottom-24 left-4 z-10 p-3 bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200/80 rounded-full shadow-xl transition-colors"
              title="Mở lịch sử trò chuyện"
            >
              <History className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
