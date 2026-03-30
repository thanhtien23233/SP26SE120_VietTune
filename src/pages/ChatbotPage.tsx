import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, History, ChevronLeft, Menu, Plus } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import { INTELLIGENCE_NAME, API_BASE_URL } from "@/config/constants";
import { sendResearcherChatMessage } from "@/services/researcherChatService";
import { useAuth } from "@/contexts/AuthContext";
import { getItem } from "@/services/storageService";
import axios from "axios";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface QAConversationRequest {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

interface QAMessageRequest {
  id: string;
  conversationId: string;
  role: number;
  content: string;
  sourceRecordingIdsJson?: string | null;
  sourceKBEntryIdsJson?: string | null;
  confidenceScore?: number;
  flaggedByExpert?: boolean;
  correctedByExpertId?: string | null;
  expertCorrection?: string | null;
  createdAt: string;
}

const createQAConversation = async (data: QAConversationRequest) => {
  try {
    const token = getItem("access_token");
    await axios.post(`${API_BASE_URL}/QAConversation`, data, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch (err) {
    console.error("Lỗi khi tạo conversation:", err);
  }
};

const createQAMessage = async (data: QAMessageRequest) => {
  try {
    const token = getItem("access_token");
    await axios.post(`${API_BASE_URL}/QAMessage`, data, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch (err) {
    console.error("Lỗi khi lưu tin nhắn:", err);
  }
};

const fetchUserConversations = async (userId: string): Promise<QAConversationRequest[]> => {
  try {
    const token = getItem("access_token");
    const res = await axios.get(`${API_BASE_URL}/QAConversation/get-by-user`, {
      params: { userId },
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return res.data?.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy lịch sử hội thoại:", err);
    return [];
  }
};

const fetchConversationMessages = async (conversationId: string): Promise<QAMessageRequest[]> => {
  try {
    const token = getItem("access_token");
    const res = await axios.get(`${API_BASE_URL}/QAMessage/get-by-conversation`, {
      params: { conversationId },
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return res.data?.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy tin nhắn hội thoại:", err);
    return [];
  }
};

/** Tin chào — đồng bộ với tab Hỏi Đáp AI (ResearcherPortalPage). */
const WELCOME_MESSAGE =
  "Xin chào! Tôi có thể giúp bạn tìm hiểu về âm nhạc truyền thống Việt Nam. Bạn muốn tìm hiểu về điều gì?";

/** Fallback khi API lỗi hoặc không trả về nội dung. */
const FALLBACK_REPLY =
  "Xin lỗi, tôi chưa thể trả lời. Vui lòng kiểm tra kết nối backend (VietTune API + Gemini) và thử lại.";

export default function ChatbotPage() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [isFirstMessage, setIsFirstMessage] = useState<boolean>(true);
  const [history, setHistory] = useState<QAConversationRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatTitle, setChatTitle] = useState("Cuộc trò chuyện mới");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    const data = await fetchUserConversations(user.id);
    setHistory(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setIsLoadingHistory(false);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      void loadHistory();
    }
  }, [loadHistory, user?.id]);

  const handleSelectConversation = async (conv: QAConversationRequest) => {
    setConversationId(conv.id);
    setIsFirstMessage(false);
    setChatTitle(conv.title || "Cuộc trò chuyện mới");
    setIsLoadingMessages(true);
    
    // Khởi tạo trạng thái rỗng trong lúc chờ
    setMessages([]);

    const remoteMsgs = await fetchConversationMessages(conv.id);
    if (remoteMsgs && remoteMsgs.length > 0) {
      const mapped: Message[] = remoteMsgs.map((m) => ({
        id: m.id,
        role: m.role === 0 ? "user" : "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setConversationId(crypto.randomUUID());
    setIsFirstMessage(true);
    setChatTitle("Cuộc trò chuyện mới");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    setInput("");
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsgId = crypto.randomUUID();
    const userTimestamp = new Date();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: userTimestamp,
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      if (isFirstMessage) {
        setChatTitle(text);
        await createQAConversation({
          id: conversationId,
          userId: user?.id || "00000000-0000-0000-0000-000000000000",
          title: text,
          createdAt: userTimestamp.toISOString()
        });
        setIsFirstMessage(false);
        void loadHistory(); // Refresh history list
      }

      await createQAMessage({
        id: userMsgId,
        conversationId: conversationId,
        role: 0,
        content: text,
        sourceRecordingIdsJson: "[]",
        sourceKBEntryIdsJson: "[]",
        confidenceScore: 0,
        flaggedByExpert: false,
        correctedByExpertId: null,
        expertCorrection: null,
        createdAt: userTimestamp.toISOString()
      });

      const reply = await sendResearcherChatMessage(text);
      const content = reply?.trim() || FALLBACK_REPLY;
      const botMsgId = crypto.randomUUID();
      const botTimestamp = new Date();
      const botMsg: Message = {
        id: botMsgId,
        role: "assistant",
        content,
        timestamp: botTimestamp,
      };
      
      setMessages((prev) => [...prev, botMsg]);

      await createQAMessage({
        id: botMsgId,
        conversationId: conversationId,
        role: 1,
        content: content,
        sourceRecordingIdsJson: "[]",
        sourceKBEntryIdsJson: "[]",
        confidenceScore: 0,
        flaggedByExpert: false,
        correctedByExpertId: null,
        expertCorrection: null,
        createdAt: botTimestamp.toISOString()
      });
      
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: FALLBACK_REPLY,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
          
          {/* Sidebar (Left) */}
          <div
            className={`transition-all duration-300 ease-in-out flex flex-col rounded-2xl flex-shrink-0 relative ${
              isSidebarOpen 
                ? "w-64 sm:w-80 bg-white shadow-lg border-2 border-primary-200/80" 
                : "w-0 lg:w-16 border-0 lg:border-2 lg:border-transparent bg-transparent"
            }`}
          >
            {/* Header / Toggle Button Area */}
            <div className={`flex items-center px-2 sm:px-3 py-3 ${isSidebarOpen ? "justify-between bg-primary-50 rounded-t-2xl border-b-2 border-primary-200/80" : "hidden lg:flex justify-center"}`}>
              {/* Title when open */}
              <div className={`flex flex-1 items-center overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 w-0"}`}>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <h3 className="font-semibold text-primary-800 whitespace-nowrap">Lịch sử</h3>
                </div>
                {isSidebarOpen && (
                  <button 
                    onClick={handleNewChat}
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
                className={`hidden lg:flex p-2 rounded-xl text-primary-600 cursor-pointer flex-shrink-0 transition-colors ${!isSidebarOpen ? "bg-primary-50 shadow-md border border-primary-200/80 hover:bg-primary-100" : "hover:bg-primary-100"}`}
                title={isSidebarOpen ? "Đóng lịch sử" : "Mở lịch sử"}
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
            <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-2 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 hidden lg:hidden"}`}>
              {isLoadingHistory ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
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
                    onClick={() => void handleSelectConversation(conv)}
                    className={`w-full text-left p-3 rounded-xl transition-all border-2 shadow-sm mb-2 ${
                      conversationId === conv.id
                        ? "bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100"
                        : "bg-white border-neutral-200 hover:border-primary-200 hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    <p className="font-medium text-sm truncate">{conv.title || "Cuộc trò chuyện mới"}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {new Date(conv.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col rounded-2xl border-2 border-primary-200/80 bg-white shadow-lg overflow-hidden transition-all duration-300 min-w-0">
            <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-4 sm:px-6 py-4 border-b-2 border-primary-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md lg:max-w-xl">{chatTitle}</h2>
                  <p className="text-secondary-200 text-sm mt-0.5 truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                    {INTELLIGENCE_NAME}
                  </p>
                </div>
              </div>
            </div>
            
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{
                background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)",
              }}
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
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-primary-600 text-white shadow-md"
                        : "bg-white border-2 border-secondary-200/80 text-neutral-700 shadow-sm"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 mb-1.5">
                        <Bot className="w-4 h-4" strokeWidth={2.5} />
                        {INTELLIGENCE_NAME}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {m.role === "user"
                        ? m.content
                        : m.content.split("**").map((part, i) =>
                            i % 2 === 1 ? (
                              <strong key={i} className="font-semibold text-neutral-900">
                                {part}
                              </strong>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                    </p>
                  </div>
                </div>
              )))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-white border-2 border-secondary-200/80 shadow-sm flex gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
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

