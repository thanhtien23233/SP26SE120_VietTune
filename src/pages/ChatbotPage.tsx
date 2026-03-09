import { useState, useRef, useEffect } from "react";
import { Send, Bot, Lightbulb } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import { INTELLIGENCE_NAME } from "@/config/constants";
import { sendResearcherChatMessage } from "@/services/researcherChatService";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/** Tin chào — đồng bộ với tab Hỏi Đáp AI (ResearcherPortalPage). */
const WELCOME_MESSAGE =
  "Xin chào! Tôi có thể giúp bạn tìm hiểu về âm nhạc truyền thống Việt Nam. Bạn muốn tìm hiểu về điều gì?";

/** Fallback khi API lỗi hoặc không trả về nội dung. */
const FALLBACK_REPLY =
  "Xin lỗi, tôi chưa thể trả lời. Vui lòng kiểm tra kết nối backend (VietTune API + Gemini) và thử lại.";

/** Câu hỏi gợi ý — đồng bộ với ResearcherPortalPage (tab Hỏi đáp thông minh). */
const QUICK_QUESTIONS = [
  "Đàn bầu có đặc điểm gì?",
  "So sánh nhạc cưới Tày và Thái",
  "T'rưng được chế tạo như thế nào?",
  "Hát Xoan xuất hiện khi nào?",
];

export default function ChatbotPage() {
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
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const reply = await sendResearcherChatMessage(text);
      const content = reply?.trim() || FALLBACK_REPLY;
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: FALLBACK_REPLY,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const askQuestion = async (question: string) => {
    const text = question.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const reply = await sendResearcherChatMessage(text);
      const content = reply?.trim() || FALLBACK_REPLY;
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            {INTELLIGENCE_NAME}
          </h1>
          <BackButton />
        </div>

        {/* Chatbox — UI/UX đồng bộ với ResearcherPortalPage (tab Hỏi đáp thông minh) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col rounded-2xl border-2 border-primary-200/80 bg-white shadow-lg overflow-hidden min-h-[500px] max-h-[700px]">
            <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-4 sm:px-6 py-4 border-b-2 border-primary-800">
              <h2 className="text-lg font-semibold">{INTELLIGENCE_NAME}</h2>
              <p className="text-secondary-200 text-sm mt-0.5">
                Hệ thống được đào tạo trên cơ sở tri thức đã xác minh
              </p>
            </div>
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{
                background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)",
              }}
            >
              {messages.map((m) => (
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
              ))}
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
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none text-white transition-colors cursor-pointer"
                  aria-label="Gửi"
                >
                  <Send className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div
              className="rounded-2xl border-2 border-primary-200/80 bg-white p-4 shadow-md"
              style={{ backgroundColor: "#FFFCF5" }}
            >
              <h3 className="flex items-center gap-2 text-base font-semibold text-primary-800 mb-3">
                <Lightbulb className="w-5 h-5 text-secondary-600" strokeWidth={2.5} />
                Câu hỏi gợi ý
              </h3>
              <div className="flex flex-col gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void askQuestion(q)}
                    disabled={isTyping}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-200/80 text-primary-800 font-medium text-sm hover:bg-primary-100 hover:border-primary-300 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
