import React, { useState, useRef, useEffect } from "react";
import { Search, MessageSquare, Network, GitCompare, Play, FileText, Download, Check, Send, Bot, Lightbulb, Info } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import SearchableDropdown from "@/components/common/SearchableDropdown";
import { INTELLIGENCE_NAME } from "@/config/constants";
import { ETHNICITIES, REGIONS, EVENT_TYPES, INSTRUMENTS } from "@/config/musicMetadata";

type TabId = "search" | "qa" | "graph" | "compare";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SearchFiltersState {
  ethnicGroup: string;
  instrument: string;
  region: string;
  ceremony: string;
}

interface MockResult {
  id: number;
  title: string;
  ethnicGroup: string;
  region: string;
  instruments: string[];
  ceremony: string;
  verified: boolean;
}

/** Kết quả mẫu — dữ liệu từ @/config/musicMetadata. */
const MOCK_RESULTS: MockResult[] = [
  {
    id: 1,
    title: "Hò Mái Nhà - Hát Xoan Phú Thọ",
    ethnicGroup: ETHNICITIES[0],
    region: REGIONS[0],
    instruments: [INSTRUMENTS[93], INSTRUMENTS[172]],
    ceremony: EVENT_TYPES[2],
    verified: true,
  },
  {
    id: 2,
    title: "Khèn Mông - Nhạc Lễ H'Mông",
    ethnicGroup: ETHNICITIES[5],
    region: REGIONS[0],
    instruments: [INSTRUMENTS[122]],
    ceremony: EVENT_TYPES[6],
    verified: true,
  },
  {
    id: 3,
    title: "T'rưng - Âm Nhạc Tây Nguyên",
    ethnicGroup: ETHNICITIES[9],
    region: REGIONS[4],
    instruments: [INSTRUMENTS[198]],
    ceremony: EVENT_TYPES[7],
    verified: true,
  },
];

const QUICK_QUESTIONS = [
  "Đàn bầu có đặc điểm gì?",
  "So sánh nhạc cưới Tày và Thái",
  "T'rưng được chế tạo như thế nào?",
  "Hát Xoan xuất hiện khi nào?",
];

const WELCOME_CHAT =
  "Xin chào! Tôi có thể giúp bạn tìm hiểu về âm nhạc truyền thống Việt Nam. Hãy đặt câu hỏi về nhạc cụ, nghi lễ, hoặc phong cách âm nhạc của các dân tộc.";

const MOCK_REPLY =
  "Dựa trên tài liệu được xác minh, tôi có thể cho bạn biết rằng đàn bầu là nhạc cụ độc tấu truyền thống với một dây đàn duy nhất, sử dụng kỹ thuật uốn éo để tạo ra âm thanh đặc trưng. Nhạc cụ này thường xuất hiện trong các buổi biểu diễn ca Huế và nhạc cung đình.";

export default function ResearcherPortalPage() {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFiltersState>({
    ethnicGroup: "",
    instrument: "",
    region: "",
    ceremony: "",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME_CHAT },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: MOCK_REPLY }]);
      setIsTyping(false);
    }, 600 + Math.min(text.length * 20, 800));
  };

  const handleQaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const askQuestion = (question: string) => {
    setChatInput(question);
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: MOCK_REPLY }]);
      setIsTyping(false);
    }, 800);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "search", label: "Tìm kiếm nâng cao", icon: Search },
    { id: "qa", label: "Hỏi đáp thông minh", icon: MessageSquare },
    { id: "graph", label: "Biểu đồ tri thức", icon: Network },
    { id: "compare", label: "So sánh phân tích", icon: GitCompare },
  ];

  return (
    <div className="min-h-screen min-w-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Cổng nghiên cứu
          </h1>
          <BackButton />
        </div>

        {/* Tabs — VietTune UI: rounded-2xl, #FFFCF5, border-neutral-200/80 */}
        <div
          className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl min-w-0 overflow-x-hidden"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <nav
            className="flex flex-wrap gap-2 p-4 sm:p-6 lg:p-8 border-b border-neutral-200/80 bg-white/50"
            aria-label="Cổng nghiên cứu"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white border-primary-600 shadow-md"
                    : "text-neutral-700 bg-white border-neutral-200/80 hover:border-primary-300 hover:bg-primary-50/80"
                }`}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab: Tìm kiếm nâng cao */}
          {activeTab === "search" && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              <div
                className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6 transition-all duration-300"
                style={{ backgroundColor: "#FFFCF5" }}
              >
                <h2 className="text-lg sm:text-xl font-semibold text-primary-800 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
                  Tìm kiếm ngữ nghĩa
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Ví dụ: "Tìm bài hát mùa màng dùng đàn bầu ở Tây Nam Bộ"'
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-primary-200/80 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-neutral-900 placeholder-neutral-500"
                    aria-label="Tìm kiếm ngữ nghĩa"
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Search className="w-5 h-5" strokeWidth={2.5} />
                    Tìm kiếm
                  </button>
                </div>
              </div>

              {/* Bộ lọc — data từ musicMetadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm hover:border-secondary-300 transition-all">
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 mb-2">
                    <span className="text-secondary-600">Dân tộc</span>
                  </label>
                  <SearchableDropdown
                    value={filters.ethnicGroup}
                    onChange={(v) => setFilters((prev) => ({ ...prev, ethnicGroup: v }))}
                    options={ETHNICITIES}
                    placeholder="Tất cả (54 dân tộc)"
                    searchable
                  />
                </div>
                <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm hover:border-secondary-300 transition-all">
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 mb-2">
                    Nhạc cụ
                  </label>
                  <SearchableDropdown
                    value={filters.instrument}
                    onChange={(v) => setFilters((prev) => ({ ...prev, instrument: v }))}
                    options={INSTRUMENTS}
                    placeholder="Tất cả (200+ nhạc cụ)"
                    searchable
                  />
                </div>
                <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm hover:border-secondary-300 transition-all">
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 mb-2">
                    Nghi lễ
                  </label>
                  <SearchableDropdown
                    value={filters.ceremony}
                    onChange={(v) => setFilters((prev) => ({ ...prev, ceremony: v }))}
                    options={EVENT_TYPES}
                    placeholder="Tất cả nghi lễ"
                    searchable={false}
                  />
                </div>
                <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm hover:border-secondary-300 transition-all">
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 mb-2">
                    Vùng miền
                  </label>
                  <SearchableDropdown
                    value={filters.region}
                    onChange={(v) => setFilters((prev) => ({ ...prev, region: v }))}
                    options={REGIONS}
                    placeholder="Tất cả vùng miền"
                    searchable={false}
                  />
                </div>
              </div>

              {/* Kết quả */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-primary-800">
                  Kết quả tìm kiếm
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 font-medium">
                    Tìm thấy {MOCK_RESULTS.length} bản ghi
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" strokeWidth={2.5} />
                    Xuất dữ liệu
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {MOCK_RESULTS.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-xl border-2 border-primary-200/80 bg-white p-4 sm:p-5 shadow-md hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg font-semibold text-primary-800">
                            {result.title}
                          </h3>
                          {result.verified && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                              Đã xác minh
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <strong className="block text-primary-700 font-semibold mb-0.5">
                              Dân tộc
                            </strong>
                            <span className="text-neutral-600">{result.ethnicGroup}</span>
                          </div>
                          <div>
                            <strong className="block text-primary-700 font-semibold mb-0.5">
                              Vùng miền
                            </strong>
                            <span className="text-neutral-600">{result.region}</span>
                          </div>
                          <div>
                            <strong className="block text-primary-700 font-semibold mb-0.5">
                              Nhạc cụ
                            </strong>
                            <span className="text-neutral-600">
                              {result.instruments.join(", ")}
                            </span>
                          </div>
                          <div>
                            <strong className="block text-primary-700 font-semibold mb-0.5">
                              Nghi lễ
                            </strong>
                            <span className="text-neutral-600">{result.ceremony}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-shrink-0">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4" strokeWidth={2.5} />
                          Phát
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                        >
                          <FileText className="w-4 h-4" strokeWidth={2.5} />
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Hỏi đáp thông minh */}
          {activeTab === "qa" && (
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col rounded-2xl border-2 border-primary-200/80 bg-white shadow-lg overflow-hidden min-h-[500px] max-h-[700px]">
                  <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-4 sm:px-6 py-4 border-b-2 border-primary-800">
                    <h2 className="text-lg font-semibold">VietTune Intelligence</h2>
                    <p className="text-secondary-200 text-sm mt-0.5">
                      Hệ thống được đào tạo trên cơ sở tri thức đã xác minh
                    </p>
                  </div>
                  <div
                    ref={chatListRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    style={{
                      background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)",
                    }}
                  >
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-primary-600 text-white shadow-md"
                              : "bg-white border-2 border-secondary-200/80 text-neutral-700 shadow-sm"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 mb-1.5">
                              <Bot className="w-4 h-4" strokeWidth={2.5} />
                              {INTELLIGENCE_NAME}
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
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
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleQaKeyDown}
                        placeholder="Hỏi về nhạc cụ, phong cách biểu diễn, lịch sử,..."
                        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border-2 border-primary-200/80 focus:border-primary-500 outline-none text-neutral-900 placeholder-neutral-500"
                        aria-label="Tin nhắn"
                      />
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isTyping}
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
                          onClick={() => askQuestion(q)}
                          className="w-full text-left px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-200/80 text-primary-800 font-medium text-sm hover:bg-primary-100 hover:border-primary-300 transition-all cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div
                    className="rounded-xl border-2 border-secondary-300 bg-gradient-to-br from-secondary-50 to-amber-50 p-4"
                    style={{ borderColor: "rgba(251, 191, 36, 0.6)" }}
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
          )}

          {/* Tab: Biểu đồ tri thức */}
          {activeTab === "graph" && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              <div
                className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6"
                style={{ backgroundColor: "#FFFCF5" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-primary-800">
                    Biểu đồ tri thức tương tác
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold text-sm shadow-md cursor-pointer"
                    >
                      Tổng quan
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-700 font-semibold text-sm cursor-pointer hover:bg-neutral-300"
                    >
                      Nhạc cụ
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-700 font-semibold text-sm cursor-pointer hover:bg-neutral-300"
                    >
                      Dân tộc
                    </button>
                  </div>
                </div>
                <div
                  className="relative rounded-xl border-2 border-secondary-200/80 overflow-hidden flex items-center justify-center"
                  style={{
                    height: "min(600px, 70vh)",
                    background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)",
                  }}
                >
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 800 600"
                    className="max-h-[600px]"
                    aria-hidden
                  >
                    <g transform="translate(400, 300)">
                      <circle
                        cx="0"
                        cy="0"
                        r="60"
                        fill="#9B2C2C"
                        opacity="0.2"
                      >
                        <animate
                          attributeName="r"
                          values="60;65;60"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle cx="0" cy="0" r="50" fill="#9B2C2C" />
                      <text
                        x="0"
                        y="-5"
                        textAnchor="middle"
                        fill="white"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        Âm nhạc
                      </text>
                      <text
                        x="0"
                        y="10"
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                      >
                        Truyền thống
                      </text>
                    </g>
                    <line
                      x1="400"
                      y1="300"
                      x2="200"
                      y2="150"
                      stroke="#9B2C2C"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <circle
                      cx="200"
                      cy="150"
                      r="45"
                      fill="#9B2C2C"
                      opacity="0.9"
                      className="cursor-pointer"
                    />
                    <text x="200" y="145" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      Dân tộc
                    </text>
                    <text x="200" y="160" textAnchor="middle" fill="white" fontSize="10">
                      {ETHNICITIES.length}
                    </text>
                    <line
                      x1="400"
                      y1="300"
                      x2="600"
                      y2="150"
                      stroke="#d97706"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <circle
                      cx="600"
                      cy="150"
                      r="45"
                      fill="#d97706"
                      opacity="0.9"
                      className="cursor-pointer"
                    />
                    <text x="600" y="145" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      Nhạc cụ
                    </text>
                    <text x="600" y="160" textAnchor="middle" fill="white" fontSize="10">
                      200+
                    </text>
                    <line
                      x1="400"
                      y1="300"
                      x2="200"
                      y2="450"
                      stroke="#b45309"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <circle
                      cx="200"
                      cy="450"
                      r="45"
                      fill="#b45309"
                      opacity="0.9"
                      className="cursor-pointer"
                    />
                    <text x="200" y="445" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      Nghi lễ
                    </text>
                    <text x="200" y="460" textAnchor="middle" fill="white" fontSize="10">
                      {EVENT_TYPES.length}+
                    </text>
                    <line
                      x1="400"
                      y1="300"
                      x2="600"
                      y2="450"
                      stroke="#ca8a04"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <circle
                      cx="600"
                      cy="450"
                      r="45"
                      fill="#ca8a04"
                      opacity="0.9"
                      className="cursor-pointer"
                    />
                    <text x="600" y="445" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      Vùng miền
                    </text>
                    <text x="600" y="460" textAnchor="middle" fill="white" fontSize="10">
                      {REGIONS.length}
                    </text>
                    <line
                      x1="400"
                      y1="300"
                      x2="100"
                      y2="300"
                      stroke="#16a34a"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <circle
                      cx="100"
                      cy="300"
                      r="45"
                      fill="#16a34a"
                      opacity="0.9"
                      className="cursor-pointer"
                    />
                    <text x="100" y="295" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      Bài hát
                    </text>
                    <text x="100" y="310" textAnchor="middle" fill="white" fontSize="10">
                      5000+
                    </text>
                    <line
                      x1="400"
                      y1="300"
                      x2="700"
                      y2="300"
                      stroke="#2563eb"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <circle
                      cx="700"
                      cy="300"
                      r="45"
                      fill="#2563eb"
                      opacity="0.9"
                      className="cursor-pointer"
                    />
                    <text x="700" y="295" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      Nghệ nhân
                    </text>
                    <text x="700" y="310" textAnchor="middle" fill="white" fontSize="10">
                      800+
                    </text>
                  </svg>
                  <div className="absolute bottom-4 left-4 rounded-lg bg-white border-2 border-primary-200/80 shadow-md p-3 text-sm">
                    <p className="font-semibold text-primary-800 mb-1">Hướng dẫn:</p>
                    <p className="text-neutral-600 text-xs">• Click vào node để xem chi tiết</p>
                    <p className="text-neutral-600 text-xs">• Hover để xem mối quan hệ</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Tổng node",
                    value: "6,254",
                    className: "bg-gradient-to-br from-primary-50 to-red-50 border-primary-200/80",
                    valueColor: "text-primary-800",
                  },
                  {
                    label: "Mối quan hệ",
                    value: "18,762",
                    className: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/80",
                    valueColor: "text-amber-900",
                  },
                  {
                    label: "Đã xác minh",
                    value: "94%",
                    className: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/80",
                    valueColor: "text-emerald-800",
                  },
                  {
                    label: "Cập nhật",
                    value: "Hôm nay",
                    className: "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200/80",
                    valueColor: "text-sky-800",
                  },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border-2 p-4 shadow-sm ${stat.className}`}
                  >
                    <p className="text-sm text-neutral-600 font-medium mb-0.5">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: So sánh phân tích */}
          {activeTab === "compare" && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              <div
                className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6"
                style={{ backgroundColor: "#FFFCF5" }}
              >
                <h2 className="text-lg sm:text-xl font-semibold text-primary-800 mb-6">
                  So sánh phân tích
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div
                    className="rounded-xl border-2 border-secondary-200/80 p-4"
                    style={{ background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)" }}
                  >
                    <h3 className="font-semibold text-primary-800 mb-3">Lựa chọn #1</h3>
                    <SearchableDropdown
                      value={compareLeft}
                      onChange={setCompareLeft}
                      options={MOCK_RESULTS.map((r) => r.title)}
                      placeholder="Chọn bản ghi âm..."
                      searchable={false}
                    />
                    <div className="mt-4 rounded-lg bg-white border border-primary-200/80 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-neutral-700">Bản ghi âm</span>
                        <button
                          type="button"
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded cursor-pointer"
                          aria-label="Phát"
                        >
                          <Play className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div
                        className="h-16 rounded-lg flex items-center justify-center text-primary-600 font-semibold text-sm"
                        style={{
                          background: "linear-gradient(90deg, #fecaca 0%, #fef3c7 50%, #fecaca 100%)",
                        }}
                      >
                        Waveform
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-white border border-primary-200/80 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Dân tộc:</span>
                        <span className="font-semibold text-primary-800">Kinh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Nhạc cụ:</span>
                        <span className="font-semibold text-primary-800">Đàn nguyệt, Trống</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Tempo:</span>
                        <span className="font-semibold text-primary-800">120 BPM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Âm giai:</span>
                        <span className="font-semibold text-primary-800">Ngũ cung</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-xl border-2 border-secondary-200/80 p-4"
                    style={{ background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)" }}
                  >
                    <h3 className="font-semibold text-primary-800 mb-3">Lựa chọn #2</h3>
                    <SearchableDropdown
                      value={compareRight}
                      onChange={setCompareRight}
                      options={MOCK_RESULTS.map((r) => r.title)}
                      placeholder="Chọn bản ghi âm..."
                      searchable={false}
                    />
                    <div className="mt-4 rounded-lg bg-white border border-primary-200/80 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-neutral-700">Bản ghi âm</span>
                        <button
                          type="button"
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded cursor-pointer"
                          aria-label="Phát"
                        >
                          <Play className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div
                        className="h-16 rounded-lg flex items-center justify-center text-primary-600 font-semibold text-sm"
                        style={{
                          background: "linear-gradient(90deg, #fecaca 0%, #fef3c7 50%, #fecaca 100%)",
                        }}
                      >
                        Waveform
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-white border border-primary-200/80 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Dân tộc:</span>
                        <span className="font-semibold text-primary-800">H'Mông</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Nhạc cụ:</span>
                        <span className="font-semibold text-primary-800">Khèn</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Tempo:</span>
                        <span className="font-semibold text-primary-800">110 BPM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Âm giai:</span>
                        <span className="font-semibold text-primary-800">Ngũ âm</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Bắt đầu so sánh
                  </button>
                </div>
              </div>

              <div
                className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6"
                style={{ backgroundColor: "#FFFCF5" }}
              >
                <h3 className="text-lg font-semibold text-primary-800 mb-3">
                  Nhận xét từ chuyên gia
                </h3>
                <div className="text-neutral-700 leading-relaxed space-y-3">
                  <p>
                    <strong className="text-primary-800">Điểm tương đồng:</strong> Cả hai phong
                    cách đều sử dụng âm giai ngũ cung truyền thống của người Việt, với cấu trúc
                    giai điệu mang tính tự do và ứng tác theo ngữ điệu tiếng Việt.
                  </p>
                  <p>
                    <strong className="text-primary-800">Điểm khác biệt:</strong> Hát Xoan thể
                    hiện tính chất nghi lễ với sự kết hợp của đàn nguyệt và trống, tạo nên âm sắc
                    trang nghiêm. Trong khi đó, nhạc Khèn Mông mang đậm bản sắc văn hóa vùng cao
                    với kỹ thuật thổi đặc trưng.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}