import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, MessageSquare, Network, GitCompare, Play, FileText, Check, Send, Bot, Lightbulb, Info, X, Download, MapPin } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import SearchableDropdown from "@/components/common/SearchableDropdown";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import { INTELLIGENCE_NAME, REGION_NAMES } from "@/config/constants";
import { referenceDataService } from "@/services/referenceDataService";
import { sendResearcherChatMessage } from "@/services/researcherChatService";
import { getItemAsync, setItem } from "@/services/storageService";
import { AI_RESPONSES_REVIEW_KEY } from "@/pages/ModerationPage";
import { isYouTubeUrl } from "@/utils/youtube";
import { Recording, VerificationStatus } from "@/types";
import { recordingService } from "@/services/recordingService";

type TabId = "search" | "qa" | "graph" | "compare";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}

interface ChatCitation {
  recordingId: string;
  label: string;
}

interface SearchFiltersState {
  ethnicGroup: string;
  instrument: string;
  region: string;
  ceremony: string;
  commune: string;
}

function extractRecordingListFromApiResponse(res: unknown): Recording[] {
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as Recording[];
  const data = r.data;
  if (Array.isArray(data)) return data as Recording[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as Recording[];
  }
  return [];
}

const QUICK_QUESTIONS = [
  "Đàn bầu có đặc điểm gì?",
  "So sánh nhạc cưới Tày và Thái",
  "T'rưng được chế tạo như thế nào?",
  "Hát Xoan xuất hiện khi nào?",
];

const WELCOME_CHAT =
  "Xin chào! Tôi có thể giúp bạn tìm hiểu về âm nhạc truyền thống Việt Nam. Hãy đặt câu hỏi về nhạc cụ, nghi lễ, hoặc phong cách âm nhạc của các dân tộc.";

const CHAT_API_FALLBACK =
  "Hiện không kết nối được với VietTune Intelligence. Bạn vẫn có thể xem thông tin từ phần Tìm kiếm nâng cao và Biểu đồ tri thức.";

/** Tokenize for semantic search (NFD, no diacritics). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreRecording(r: Recording, tokens: string[]): number {
  const title = (r.title || "") + " " + (r.titleVietnamese || "");
  const desc = r.description || "";
  const ethnicityName =
    typeof r.ethnicity === "object" && r.ethnicity !== null
      ? (r.ethnicity.name || "") + " " + (r.ethnicity.nameVietnamese || "")
      : "";
  const tags = (r.tags || []).join(" ");
  const searchable = [title, desc, ethnicityName, tags]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  let score = 0;
  for (const t of tokens) {
    if (searchable.includes(t)) score += 1;
  }
  return score;
}

function applyFilters(list: Recording[], f: SearchFiltersState): Recording[] {
  return list.filter((r) => {
    if (f.ethnicGroup) {
      const name = r.ethnicity?.nameVietnamese ?? r.ethnicity?.name ?? "";
      if (name !== f.ethnicGroup) return false;
    }
    if (f.region) {
      const regionLabel = r.region ? REGION_NAMES[r.region as keyof typeof REGION_NAMES] : "";
      if (regionLabel !== f.region) return false;
    }
    if (f.instrument) {
      const has =
        r.instruments?.some(
          (i) => (i.nameVietnamese ?? i.name) === f.instrument
        ) ?? false;
      if (!has) return false;
    }
    if (f.ceremony) {
      const has = r.tags?.some((t) => t === f.ceremony || t.includes(f.ceremony)) ?? false;
      if (!has) return false;
    }
    if (f.commune) {
      const communeName = getCommuneName(r).toLowerCase();
      if (!communeName || !communeName.includes(f.commune.toLowerCase())) return false;
    }
    return true;
  });
}

function getCommuneName(r: Recording): string {
  const maybeWithCommune = r as Recording & {
    communeName?: string;
    commune?: { name?: string };
    metadata?: Recording["metadata"] & { communeName?: string };
  };
  return (
    maybeWithCommune.communeName ||
    maybeWithCommune.commune?.name ||
    maybeWithCommune.metadata?.communeName ||
    ""
  );
}

function getTranscriptText(r?: Recording): string {
  if (!r) return "";
  const lines = [r.metadata?.transcription, r.metadata?.lyrics, r.metadata?.lyricsTranslation];
  return lines.filter(Boolean).join("\n").trim();
}

function highlightTranscriptDiff(left: string, right: string): { leftHtml: string; rightHtml: string } {
  const leftWords = left.split(/\s+/).filter(Boolean);
  const rightWords = right.split(/\s+/).filter(Boolean);
  const rightSet = new Set(rightWords.map((w) => w.toLowerCase()));
  const leftSet = new Set(leftWords.map((w) => w.toLowerCase()));

  const toHtml = (words: string[], oppositeSet: Set<string>) =>
    words
      .map((w) => {
        const escaped = w
          .split("&").join("&amp;")
          .split("<").join("&lt;")
          .split(">").join("&gt;");
        const changed = !oppositeSet.has(w.toLowerCase());
        return changed
          ? `<mark class="bg-amber-200 text-amber-900 rounded px-1">${escaped}</mark>`
          : escaped;
      })
      .join(" ");

  return {
    leftHtml: toHtml(leftWords, rightSet),
    rightHtml: toHtml(rightWords, leftSet),
  };
}

function buildExpertComparativeNotes(left?: Recording, right?: Recording): string[] {
  if (!left || !right) return [];
  const notes: string[] = [];
  const leftEth = left.ethnicity?.nameVietnamese ?? left.ethnicity?.name ?? "không rõ";
  const rightEth = right.ethnicity?.nameVietnamese ?? right.ethnicity?.name ?? "không rõ";
  if (leftEth !== rightEth) {
    notes.push(`Hai bản thu thuộc hai cộng đồng khác nhau (${leftEth} và ${rightEth}), cần lưu ý dị bản vùng miền khi trích dẫn học thuật.`);
  }
  const leftInst = new Set((left.instruments ?? []).map((i) => i.nameVietnamese ?? i.name));
  const rightInst = new Set((right.instruments ?? []).map((i) => i.nameVietnamese ?? i.name));
  const sharedInst = Array.from(leftInst).filter((x) => rightInst.has(x));
  if (sharedInst.length > 0) {
    notes.push(`Cả hai bản thu cùng dùng nhạc cụ: ${sharedInst.join(", ")}, phù hợp để đối chiếu kỹ thuật diễn tấu.`);
  } else {
    notes.push("Bộ nhạc cụ giữa hai bản thu khác nhau rõ rệt, thuận lợi cho phân tích khác biệt âm sắc.");
  }
  const leftVariation = left.metadata?.regionalVariation;
  const rightVariation = right.metadata?.regionalVariation;
  if (leftVariation || rightVariation) {
    notes.push(`Ghi chú dị bản: ${leftVariation || "Bản 1 chưa có ghi chú"} | ${rightVariation || "Bản 2 chưa có ghi chú"}`);
  }
  return notes;
}

function buildCitationCandidates(question: string, recordings: Recording[]): ChatCitation[] {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];
  return recordings
    .map((r) => ({ r, score: scoreRecording(r, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ r }) => {
      const ethnicity = r.ethnicity?.nameVietnamese ?? r.ethnicity?.name ?? "Không rõ dân tộc";
      const region = r.region ? REGION_NAMES[r.region as keyof typeof REGION_NAMES] : "Không rõ vùng";
      return {
        recordingId: r.id,
        label: `${r.title} — ${ethnicity} — ${region}`,
      };
    });
}

export default function ResearcherPortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.pathname;

  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFiltersState>({
    ethnicGroup: "",
    instrument: "",
    region: "",
    ceremony: "",
    commune: "",
  });
  const [approvedRecordings, setApprovedRecordings] = useState<Recording[]>([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [playModalRecording, setPlayModalRecording] = useState<Recording | null>(null);
  const [playModalLoading, setPlayModalLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME_CHAT },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("");
  const [graphView, setGraphView] = useState<"overview" | "instruments" | "ethnicity">("overview");
  const [selectedGraphNode, setSelectedGraphNode] = useState<{ type: "instrument" | "ethnicity"; name: string } | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  // Reference data from API (replaces hardcoded arrays)
  const [ETHNICITIES, setETHNICITIES] = useState<string[]>([]);
  const [REGIONS] = useState<string[]>([
    "Trung du và miền núi Bắc Bộ",
    "Đồng bằng Bắc Bộ",
    "Bắc Trung Bộ",
    "Nam Trung Bộ",
    "Cao nguyên Trung Bộ",
    "Đông Nam Bộ",
    "Tây Nam Bộ",
  ]);
  const [EVENT_TYPES, setEVENT_TYPES] = useState<string[]>([]);
  const [INSTRUMENTS, setINSTRUMENTS] = useState<string[]>([]);
  const [COMMUNES, setCOMMUNES] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ethnicGroups = await referenceDataService.getEthnicGroups();
        if (!cancelled && ethnicGroups.length > 0) setETHNICITIES(ethnicGroups.map((e) => e.name));
      } catch (err) { console.warn("Failed to load ethnic groups", err); }

      try {
        const ceremonies = await referenceDataService.getCeremonies();
        if (!cancelled && ceremonies.length > 0) setEVENT_TYPES(ceremonies.map((c) => c.name));
      } catch (err) { console.warn("Failed to load ceremonies", err); }

      try {
        const instrumentItems = await referenceDataService.getInstruments();
        if (!cancelled && instrumentItems.length > 0) setINSTRUMENTS(instrumentItems.map((i) => i.name));
      } catch (err) { console.warn("Failed to load instruments", err); }
      try {
        const communes = await referenceDataService.getCommunes();
        if (!cancelled && communes.length > 0) setCOMMUNES(communes.map((c) => c.name));
      } catch (err) { console.warn("Failed to load communes", err); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Knowledge graph: ethnicities, instruments, and edges from approved recordings (nhạc cụ nào của dân tộc nào)
  const graphData = useMemo(() => {
    const edgeSet = new Set<string>();
    const ethSet = new Set<string>();
    const instSet = new Set<string>();
    for (const r of approvedRecordings) {
      const ethName = r.ethnicity?.nameVietnamese ?? r.ethnicity?.name ?? "";
      if (!ethName) continue;
      ethSet.add(ethName);
      for (const inst of r.instruments ?? []) {
        const iname = inst.nameVietnamese ?? inst.name ?? "";
        if (!iname) continue;
        instSet.add(iname);
        edgeSet.add(`${ethName}\t${iname}`);
      }
    }
    const ethnicities = Array.from(ethSet).sort((a, b) => a.localeCompare(b, "vi"));
    const instruments = Array.from(instSet).sort((a, b) => a.localeCompare(b, "vi"));
    const edges = Array.from(edgeSet).map((key) => {
      const [e, i] = key.split("\t");
      return { ethnicity: e, instrument: i };
    });
    return { ethnicities, instruments, edges };
  }, [approvedRecordings]);

  // Clear selected node when switching graph view to avoid stale "Bản thu liên quan".
  useEffect(() => {
    setSelectedGraphNode(null);
  }, [graphView]);

  // Load expert-approved recordings (contributor contributions approved by expert)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSearchLoading(true);
      try {
        const res = await recordingService.getRecordings(1, 500);
        const items = extractRecordingListFromApiResponse(res);
        if (!cancelled) setApprovedRecordings(items);
      } catch (err) {
        console.error("Failed to load approved recordings:", err);
        if (!cancelled) setApprovedRecordings([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // When Play modal opens, load full local recording to get media src and type
  useEffect(() => {
    if (!playModalRecording?.id) {
      return;
    }
    setPlayModalLoading(true);
    // In actual implementation here we could fetch full API data if needed.
    // However getRecordings already returns audioUrl
    setPlayModalLoading(false);
  }, [playModalRecording?.id]);

  const filteredResults = useMemo(() => {
    let list = approvedRecordings;
    const trimmed = searchQuery.trim();
    if (trimmed) {
      const tokens = tokenize(trimmed);
      const scored = list
        .map((r) => ({ r, score: scoreRecording(r, tokens) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.r);
      list = scored;
    }
    return applyFilters(list, filters);
  }, [approvedRecordings, searchQuery, filters]);

  const graphRelatedRecordings = useMemo(() => {
    if (!selectedGraphNode) return [];
    if (selectedGraphNode.type === "instrument") {
      return approvedRecordings.filter((r) =>
        r.instruments?.some((i) => (i.nameVietnamese ?? i.name) === selectedGraphNode.name)
      );
    }
    return approvedRecordings.filter(
      (r) => (r.ethnicity?.nameVietnamese ?? r.ethnicity?.name) === selectedGraphNode.name
    );
  }, [approvedRecordings, selectedGraphNode]);

  const handleExportDataset = useCallback(() => {
    const payload = filteredResults.map((r) => ({
      id: r.id,
      title: r.title,
      titleVietnamese: r.titleVietnamese,
      description: r.description,
      ethnicity: r.ethnicity,
      region: r.region,
      instruments: r.instruments?.map((i) => i.nameVietnamese ?? i.name) ?? [],
      tags: r.tags,
      recordedDate: r.recordedDate,
      uploadedDate: r.uploadedDate,
      verificationStatus: r.verificationStatus,
    }));
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), total: payload.length, recordings: payload }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viettune-researcher-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  const handleSearchClick = useCallback(() => {
    setIsSearching(true);
    const minSearchDelayMs = 450;
    setTimeout(() => setIsSearching(false), minSearchDelayMs);
  }, []);

  const handlePlay = useCallback((recording: Recording) => {
    setPlayModalRecording(recording);
  }, []);

  const handleClosePlayModal = useCallback(() => {
    setPlayModalRecording(null);
  }, []);

  const handleDetail = useCallback(
    (id: string) => {
      navigate(`/recordings/${id}`, { state: { from: returnTo } });
    },
    [navigate, returnTo]
  );

  useEffect(() => {
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const pushAiResponseForExpertReview = useCallback(async (question: string, answer: string, citations?: ChatCitation[]) => {
    try {
      const raw = await getItemAsync(AI_RESPONSES_REVIEW_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const next = [
        ...(Array.isArray(list) ? list : []),
        {
          id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          question,
          answer,
          source: "Cổng nghiên cứu",
          citations: citations ?? [],
          createdAt: new Date().toISOString(),
        },
      ];
      await setItem(AI_RESPONSES_REVIEW_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setIsTyping(true);
    try {
      const reply = await sendResearcherChatMessage(text);
      const content = reply ?? CHAT_API_FALLBACK;
      const citations = buildCitationCandidates(text, approvedRecordings);
      setChatMessages((prev) => [...prev, { role: "assistant", content, citations }]);
      void pushAiResponseForExpertReview(text, content, citations);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: CHAT_API_FALLBACK }]);
    } finally {
      setIsTyping(false);
    }
  }, [chatInput, approvedRecordings, pushAiResponseForExpertReview]);

  const handleQaKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      try {
        await handleSendMessage();
      } catch {
        // Safety net: handleSendMessage already catches, but avoid floating-promise/unhandled rejections.
        setChatMessages((prev) => [...prev, { role: "assistant", content: CHAT_API_FALLBACK }]);
        setIsTyping(false);
      }
    }
  };

  const askQuestion = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setIsTyping(true);
    try {
      const reply = await sendResearcherChatMessage(text);
      const content = reply ?? CHAT_API_FALLBACK;
      const citations = buildCitationCandidates(text, approvedRecordings);
      setChatMessages((prev) => [...prev, { role: "assistant", content, citations }]);
      void pushAiResponseForExpertReview(text, content, citations);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: CHAT_API_FALLBACK }]);
    } finally {
      setIsTyping(false);
    }
  }, [approvedRecordings, pushAiResponseForExpertReview]);

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

        <div className="rounded-2xl border border-primary-200/80 bg-white shadow-sm p-4 sm:p-5 mb-5">
          <h2 className="text-sm sm:text-base font-semibold text-primary-800 mb-3">Luồng nghiệp vụ chính của Researcher</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              { title: "1) Discovery & Research", desc: "Tìm kiếm ngữ nghĩa, hỏi đáp AI, biểu đồ tri thức, so sánh và xuất dataset." },
              { title: "2) Expert Verification", desc: "Đánh giá 3 bước, gắn cờ phản hồi AI, cập nhật tri thức cộng tác." },
              { title: "3) Contribution", desc: "Nộp bản thu hiện trường, điền metadata có cấu trúc, theo dõi tiến trình kiểm duyệt." },
            ].map((flow) => (
              <div key={flow.title} className="rounded-xl border border-neutral-200/80 bg-primary-50/40 px-3 py-2.5">
                <p className="font-semibold text-primary-800 text-sm">{flow.title}</p>
                <p className="text-xs text-neutral-700 mt-1">{flow.desc}</p>
              </div>
            ))}
          </div>
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${activeTab === tab.id
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchClick();
                    }}
                    placeholder='Ví dụ: "Tìm bài hát mùa màng dùng đàn bầu ở Tây Nam Bộ"'
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-primary-200/80 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-neutral-900 placeholder-neutral-500"
                    aria-label="Tìm kiếm ngữ nghĩa"
                  />
                  <button
                    type="button"
                    onClick={handleSearchClick}
                    disabled={isSearching}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-80 disabled:cursor-wait text-white font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer min-w-[120px]"
                    aria-busy={isSearching}
                  >
                    <Search className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                    <span>{isSearching ? "Đang tìm..." : "Tìm kiếm"}</span>
                  </button>
                </div>
              </div>

              {/* Bộ lọc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm hover:border-secondary-300 transition-all">
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 mb-2">
                    <MapPin className="w-4 h-4 text-secondary-600" strokeWidth={2.5} />
                    Xã/Phường
                  </label>
                  <SearchableDropdown
                    value={filters.commune}
                    onChange={(v) => setFilters((prev) => ({ ...prev, commune: v }))}
                    options={COMMUNES}
                    placeholder="Tất cả xã/phường"
                    searchable
                  />
                </div>
              </div>

              {/* Kết quả — chỉ bản thu đã được expert kiểm duyệt */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-primary-800">
                  Kết quả tìm kiếm
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-neutral-600 font-medium">
                    {searchLoading
                      ? "Đang tải..."
                      : isSearching
                        ? "Đang tìm kiếm bản thu phù hợp..."
                        : `Tìm thấy ${filteredResults.length} bản ghi đã kiểm duyệt`}
                  </span>
                  <button
                    type="button"
                    onClick={handleExportDataset}
                    disabled={searchLoading || filteredResults.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-300/80 bg-primary-50/90 text-primary-700 hover:bg-primary-100/90 font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" strokeWidth={2.5} />
                    Xuất dataset (JSON)
                  </button>
                </div>
              </div>

              {searchLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : isSearching ? (
                <div
                  className="rounded-xl border-2 border-primary-200/80 bg-white p-8 sm:p-12 shadow-md flex flex-col items-center justify-center gap-4"
                  style={{ backgroundColor: "#FFFCF5" }}
                  role="status"
                  aria-live="polite"
                  aria-label="Đang tìm kiếm bản thu"
                >
                  <LoadingSpinner size="lg" />
                  <p className="text-primary-700 font-medium text-center">
                    Đang tìm kiếm bản thu phù hợp với tiêu chí của bạn...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredResults.length === 0 ? (
                    <p className="text-neutral-600 py-8 text-center">
                      Không có bản thu nào khớp với bộ lọc hoặc từ khóa. Chỉ hiển thị bản thu đã được chuyên gia kiểm duyệt.
                    </p>
                  ) : (
                    filteredResults.map((result) => (
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
                              {result.verificationStatus === VerificationStatus.VERIFIED && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  Đã xác minh
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                              <div>
                                <strong className="block text-primary-700 font-semibold mb-0.5">
                                  Dân tộc
                                </strong>
                                <span className="text-neutral-600">
                                  {result.ethnicity?.nameVietnamese ?? result.ethnicity?.name ?? "—"}
                                </span>
                              </div>
                              <div>
                                <strong className="block text-primary-700 font-semibold mb-0.5">
                                  Vùng miền
                                </strong>
                                <span className="text-neutral-600">
                                  {result.region
                                    ? REGION_NAMES[result.region as keyof typeof REGION_NAMES]
                                    : "—"}
                                </span>
                              </div>
                              <div>
                                <strong className="block text-primary-700 font-semibold mb-0.5">
                                  Nhạc cụ
                                </strong>
                                <span className="text-neutral-600">
                                  {result.instruments?.length
                                    ? result.instruments
                                      .map((i) => i.nameVietnamese ?? i.name)
                                      .join(", ")
                                    : "—"}
                                </span>
                              </div>
                              <div>
                                <strong className="block text-primary-700 font-semibold mb-0.5">
                                  Nghi lễ
                                </strong>
                                <span className="text-neutral-600">
                                  {result.tags?.find((t) => EVENT_TYPES.includes(t)) ?? result.metadata?.ritualContext ?? "—"}
                                </span>
                              </div>
                              <div>
                                <strong className="block text-primary-700 font-semibold mb-0.5">
                                  Xã/Phường
                                </strong>
                                <span className="text-neutral-600">{getCommuneName(result) || "—"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePlay(result)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                            >
                              <Play className="w-4 h-4" strokeWidth={2.5} />
                              Phát
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDetail(result.id)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
                            >
                              <FileText className="w-4 h-4" strokeWidth={2.5} />
                              Chi tiết
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Modal Phát — render qua createPortal vào document.body để overlay phủ toàn trang (navbar + footer) */}
              {playModalRecording &&
                createPortal(
                  <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="play-modal-title"
                    style={{
                      animation: "fadeIn 0.3s ease-out",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: "100vw",
                      height: "100vh",
                      position: "fixed",
                    }}
                    onClick={handleClosePlayModal}
                  >
                    <div
                      className="relative rounded-2xl border border-neutral-300/80 bg-white shadow-2xl backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 pointer-events-auto transform"
                      style={{ animation: "slideUp 0.3s ease-out" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                        <h2 id="play-modal-title" className="text-lg font-semibold text-neutral-900 truncate pr-2">
                          {playModalRecording.title}
                        </h2>
                        <button
                          type="button"
                          onClick={handleClosePlayModal}
                          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                          aria-label="Đóng"
                        >
                          <X className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="p-4">
                        {playModalLoading ? (
                          <div className="flex justify-center py-12">
                            <LoadingSpinner size="lg" />
                          </div>
                        ) : playModalRecording ? (
                          (() => {
                            const mediaSrc = playModalRecording.audioUrl;
                            const isVideo = mediaSrc ? (isYouTubeUrl(mediaSrc) || mediaSrc.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i) || mediaSrc.startsWith('data:video/')) : false;

                            if (!mediaSrc) {
                              return (
                                <p className="text-neutral-600 py-4 text-center">
                                  Không có nguồn phát cho bản thu này.
                                </p>
                              );
                            }
                            const artistName = playModalRecording.performers?.[0]?.name;
                            if (isVideo) {
                              return (
                                <VideoPlayer
                                  src={mediaSrc}
                                  title={playModalRecording.title}
                                  artist={artistName}
                                  recording={playModalRecording}
                                  showContainer={true}
                                  returnTo={returnTo}
                                />
                              );
                            }
                            return (
                              <AudioPlayer
                                src={mediaSrc}
                                title={playModalRecording.title}
                                artist={artistName}
                                recording={playModalRecording}
                                showContainer={true}
                                returnTo={returnTo}
                              />
                            );
                          })()
                        ) : (
                          <p className="text-neutral-600 py-4 text-center">
                            Không tải được bản thu.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
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
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user"
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
                          {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-neutral-200">
                              <p className="text-[11px] font-semibold text-neutral-600 mb-1">Nguồn trích dẫn tham chiếu</p>
                              <ul className="space-y-1 list-none pl-0">
                                {msg.citations.map((c, cidx) => (
                                  <li key={`${idx}-cite-${cidx}`}>
                                    <button
                                      type="button"
                                      onClick={() => handleDetail(c.recordingId)}
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
                        onClick={() => {
                          void handleSendMessage();
                        }}
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
                          onClick={() => {
                            void askQuestion(q);
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

          {/* Tab: Biểu đồ tri thức (knowledge graph: dân tộc – nhạc cụ từ bản thu đã kiểm duyệt) */}
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
                      onClick={() => setGraphView("overview")}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md cursor-pointer transition-colors ${graphView === "overview"
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                        }`}
                    >
                      Tổng quan
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphView("instruments")}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md cursor-pointer transition-colors ${graphView === "instruments"
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                        }`}
                    >
                      Nhạc cụ
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphView("ethnicity")}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md cursor-pointer transition-colors ${graphView === "ethnicity"
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                        }`}
                    >
                      Dân tộc
                    </button>
                  </div>
                </div>

                {graphView === "overview" && (
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
                        <circle cx="0" cy="0" r="60" fill="#9B2C2C" opacity="0.2">
                          <animate attributeName="r" values="60;65;60" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="0" cy="0" r="50" fill="#9B2C2C" />
                        <text x="0" y="-5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Âm nhạc</text>
                        <text x="0" y="10" textAnchor="middle" fill="white" fontSize="10">Truyền thống</text>
                      </g>
                      <line x1="400" y1="300" x2="200" y2="150" stroke="#9B2C2C" strokeWidth="2" opacity="0.3" />
                      <circle cx="200" cy="150" r="45" fill="#9B2C2C" opacity="0.9" className="cursor-pointer" />
                      <text x="200" y="145" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Dân tộc</text>
                      <text x="200" y="160" textAnchor="middle" fill="white" fontSize="10">{ETHNICITIES.length}</text>
                      <line x1="400" y1="300" x2="600" y2="150" stroke="#d97706" strokeWidth="2" opacity="0.3" />
                      <circle cx="600" cy="150" r="45" fill="#d97706" opacity="0.9" className="cursor-pointer" />
                      <text x="600" y="145" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Nhạc cụ</text>
                      <text x="600" y="160" textAnchor="middle" fill="white" fontSize="10">200+</text>
                      <line x1="400" y1="300" x2="200" y2="450" stroke="#b45309" strokeWidth="2" opacity="0.3" />
                      <circle cx="200" cy="450" r="45" fill="#b45309" opacity="0.9" className="cursor-pointer" />
                      <text x="200" y="445" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Nghi lễ</text>
                      <text x="200" y="460" textAnchor="middle" fill="white" fontSize="10">{EVENT_TYPES.length}+</text>
                      <line x1="400" y1="300" x2="600" y2="450" stroke="#ca8a04" strokeWidth="2" opacity="0.3" />
                      <circle cx="600" cy="450" r="45" fill="#ca8a04" opacity="0.9" className="cursor-pointer" />
                      <text x="600" y="445" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Vùng miền</text>
                      <text x="600" y="460" textAnchor="middle" fill="white" fontSize="10">{REGIONS.length}</text>
                      <line x1="400" y1="300" x2="100" y2="300" stroke="#16a34a" strokeWidth="2" opacity="0.3" />
                      <circle cx="100" cy="300" r="45" fill="#16a34a" opacity="0.9" className="cursor-pointer" />
                      <text x="100" y="295" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Bài hát</text>
                      <text x="100" y="310" textAnchor="middle" fill="white" fontSize="10">5000+</text>
                      <line x1="400" y1="300" x2="700" y2="300" stroke="#2563eb" strokeWidth="2" opacity="0.3" />
                      <circle cx="700" cy="300" r="45" fill="#2563eb" opacity="0.9" className="cursor-pointer" />
                      <text x="700" y="295" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Nghệ nhân</text>
                      <text x="700" y="310" textAnchor="middle" fill="white" fontSize="10">800+</text>
                    </svg>
                    <div className="absolute bottom-4 left-4 rounded-lg bg-white border-2 border-primary-200/80 shadow-md p-3 text-sm">
                      <p className="font-semibold text-primary-800 mb-1">Hướng dẫn:</p>
                      <p className="text-neutral-600 text-xs">• Chọn <strong>Nhạc cụ</strong> hoặc <strong>Dân tộc</strong> để xem đồ thị nối nhạc cụ với dân tộc tương ứng</p>
                    </div>
                  </div>
                )}

                {(graphView === "instruments" || graphView === "ethnicity") && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Danh sách: Nhạc cụ hoặc Dân tộc */}
                    <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm max-h-[min(500px,60vh)] overflow-y-auto">
                      <h3 className="text-sm font-semibold text-primary-800 mb-2 sticky top-0 bg-white py-1">
                        {graphView === "instruments" ? `Danh sách nhạc cụ (${graphData.instruments.length})` : `Danh sách dân tộc (${graphData.ethnicities.length})`}
                      </h3>
                      <ul className="space-y-1 text-sm text-neutral-700">
                        {(graphView === "instruments" ? graphData.instruments : graphData.ethnicities).map((name, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              className={`w-full truncate text-left px-2 py-1.5 rounded-lg transition-colors ${selectedGraphNode?.name === name
                                ? "bg-primary-100 text-primary-800 font-semibold"
                                : "hover:bg-neutral-100"
                                }`}
                              title={name}
                              onClick={() =>
                                setSelectedGraphNode({
                                  type: graphView === "instruments" ? "instrument" : "ethnicity",
                                  name,
                                })
                              }
                            >
                              {name}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {((graphView === "instruments" && graphData.instruments.length === 0) || (graphView === "ethnicity" && graphData.ethnicities.length === 0)) && (
                        <p className="text-neutral-500 text-xs">Chưa có dữ liệu từ bản thu đã kiểm duyệt.</p>
                      )}
                    </div>
                    {/* Đồ thị hai cột: Dân tộc – Nhạc cụ, nối theo cạnh (nhạc cụ của dân tộc nào) */}
                    <div
                      className="lg:col-span-3 relative rounded-xl border-2 border-secondary-200/80 overflow-hidden flex items-center justify-center"
                      style={{
                        height: "min(500px, 60vh)",
                        background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)",
                      }}
                    >
                      {graphData.ethnicities.length === 0 || graphData.instruments.length === 0 ? (
                        <p className="text-neutral-600 text-center px-4">
                          Chưa đủ dữ liệu để vẽ đồ thị. Cần có bản thu đã kiểm duyệt có cả dân tộc và nhạc cụ.
                        </p>
                      ) : (
                        <svg
                          width="100%"
                          height="100%"
                          viewBox="0 0 800 500"
                          className="max-h-[500px]"
                          aria-label="Biểu đồ nhạc cụ và dân tộc"
                        >
                          {/* Layout: cột trái x=100 (dân tộc), cột phải x=700 (nhạc cụ). Spread theo chiều dọc. */}
                          {(() => {
                            const leftX = 100;
                            const rightX = 700;
                            const paddingY = 40;
                            const nEth = graphData.ethnicities.length;
                            const nInst = graphData.instruments.length;
                            const ethY = (i: number) => paddingY + (nEth <= 1 ? 250 : (i / (nEth - 1)) * (500 - 2 * paddingY));
                            const instY = (i: number) => paddingY + (nInst <= 1 ? 250 : (i / (nInst - 1)) * (500 - 2 * paddingY));
                            const ethIdx = Object.fromEntries(graphData.ethnicities.map((e, i) => [e, i]));
                            const instIdx = Object.fromEntries(graphData.instruments.map((e, i) => [e, i]));
                            return (
                              <>
                                {/* Cạnh nối dân tộc – nhạc cụ */}
                                <g stroke="#9B2C2C" strokeWidth="1.5" opacity="0.4">
                                  {graphData.edges.map(({ ethnicity, instrument }, k) => {
                                    const ei = ethIdx[ethnicity];
                                    const ii = instIdx[instrument];
                                    if (ei == null || ii == null) return null;
                                    const y1 = ethY(ei);
                                    const y2 = instY(ii);
                                    return <line key={k} x1={leftX} y1={y1} x2={rightX} y2={y2} />;
                                  })}
                                </g>
                                {/* Node dân tộc (trái) */}
                                {graphData.ethnicities.map((name, i) => (
                                  <g key={`eth-${i}`}>
                                    <circle cx={leftX} cy={ethY(i)} r="20" fill="#9B2C2C" className="cursor-pointer" />
                                    <text x={leftX} y={ethY(i) + 28} textAnchor="middle" fill="#374151" fontSize="10">{name.length > 12 ? name.slice(0, 11) + "…" : name}</text>
                                  </g>
                                ))}
                                {/* Node nhạc cụ (phải) */}
                                {graphData.instruments.map((name, i) => (
                                  <g key={`inst-${i}`}>
                                    <circle cx={rightX} cy={instY(i)} r="20" fill="#d97706" className="cursor-pointer" />
                                    <text x={rightX} y={instY(i) + 28} textAnchor="middle" fill="#374151" fontSize="10">{name.length > 14 ? name.slice(0, 13) + "…" : name}</text>
                                  </g>
                                ))}
                                {/* Chú thích */}
                                <text x={leftX} y="20" textAnchor="middle" fill="#9B2C2C" fontSize="11" fontWeight="bold">Dân tộc</text>
                                <text x={rightX} y="20" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="bold">Nhạc cụ</text>
                              </>
                            );
                          })()}
                        </svg>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 rounded bg-white/90 border border-primary-200/80 shadow p-2 text-xs text-neutral-600 text-center">
                        Đoạn thẳng nối nhạc cụ với dân tộc tương ứng (từ bản thu đã kiểm duyệt).
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(graphView === "instruments" || graphView === "ethnicity") &&
                selectedGraphNode &&
                selectedGraphNode.type === (graphView === "instruments" ? "instrument" : "ethnicity") && (
                <div className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-primary-800 mb-3">
                    Bản thu liên quan: {selectedGraphNode.name}
                  </h3>
                  {graphRelatedRecordings.length === 0 ? (
                    <p className="text-sm text-neutral-600">Chưa có bản thu phù hợp với nút đã chọn.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {graphRelatedRecordings.slice(0, 8).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleDetail(r.id)}
                          className="text-left rounded-xl border border-primary-200/80 bg-primary-50/50 px-4 py-3 hover:bg-primary-100/70 transition-colors cursor-pointer"
                        >
                          <p className="font-semibold text-primary-800 truncate">{r.title}</p>
                          <p className="text-xs text-neutral-600 truncate">
                            {r.ethnicity?.nameVietnamese ?? r.ethnicity?.name ?? "—"} •{" "}
                            {r.instruments?.map((i) => i.nameVietnamese ?? i.name).slice(0, 2).join(", ") || "—"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Dân tộc (trong đồ thị)", value: String(graphData.ethnicities.length), className: "bg-gradient-to-br from-primary-50 to-red-50 border-primary-200/80", valueColor: "text-primary-800" },
                  { label: "Nhạc cụ (trong đồ thị)", value: String(graphData.instruments.length), className: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/80", valueColor: "text-amber-900" },
                  { label: "Mối quan hệ (cạnh)", value: String(graphData.edges.length), className: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/80", valueColor: "text-emerald-800" },
                  { label: "Nguồn", value: "Bản thu đã kiểm duyệt", className: "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200/80", valueColor: "text-sky-800" },
                ].map((stat, idx) => (
                  <div key={idx} className={`rounded-xl border-2 p-4 shadow-sm ${stat.className}`}>
                    <p className="text-sm text-neutral-600 font-medium mb-0.5">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: So sánh phân tích — chọn 2 bản thu, xem metadata thật, phát song song (mở modal) */}
          {activeTab === "compare" && (() => {
            const compareOptions = approvedRecordings.map((r) => r.title ?? "");
            const leftRecording = approvedRecordings.find((r) => r.id === compareLeftId);
            const rightRecording = approvedRecordings.find((r) => r.id === compareRightId);
            const leftTranscript = getTranscriptText(leftRecording);
            const rightTranscript = getTranscriptText(rightRecording);
            const transcriptDiff = highlightTranscriptDiff(leftTranscript, rightTranscript);
            const expertNotes = buildExpertComparativeNotes(leftRecording, rightRecording);
            const renderCompareCard = (rec: Recording | undefined, side: "left" | "right") => (
              <div className="rounded-xl border-2 border-secondary-200/80 p-4" style={{ background: "linear-gradient(135deg, #FFFCF5 0%, #FFF1F3 100%)" }}>
                <SearchableDropdown
                  value={rec?.title ?? ""}
                  onChange={(title) => {
                    const r = approvedRecordings.find((x) => x.title === title);
                    if (side === "left") setCompareLeftId(r?.id ?? "");
                    else setCompareRightId(r?.id ?? "");
                  }}
                  options={compareOptions}
                  placeholder="Chọn bản ghi âm..."
                  searchable
                />
                <div className="mt-4 rounded-lg bg-white border border-primary-200/80 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-neutral-700">Bản ghi âm</span>
                    {rec && (
                      <button
                        type="button"
                        onClick={() => setPlayModalRecording(rec)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer inline-flex items-center gap-1"
                        aria-label="Phát"
                      >
                        <Play className="w-4 h-4" strokeWidth={2.5} />
                        <span className="text-sm font-medium">Phát</span>
                      </button>
                    )}
                  </div>
                  {!rec ? (
                    <p className="text-neutral-500 text-sm py-4 text-center">Chọn bản thu để xem metadata và phát</p>
                  ) : (
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Dân tộc:</span>
                        <span className="font-semibold text-primary-800">{rec.ethnicity?.nameVietnamese ?? rec.ethnicity?.name ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Nhạc cụ:</span>
                        <span className="font-semibold text-primary-800">
                          {rec.instruments?.map((i) => i.nameVietnamese ?? i.name).join(", ") || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Vùng miền:</span>
                        <span className="font-semibold text-primary-800">
                          {rec.region ? REGION_NAMES[rec.region as keyof typeof REGION_NAMES] : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Thể loại / Tags:</span>
                        <span className="font-semibold text-primary-800">{(rec.tags ?? []).slice(0, 3).join(", ") || "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            return (
              <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6" style={{ backgroundColor: "#FFFCF5" }}>
                  <h2 className="text-lg sm:text-xl font-semibold text-primary-800 mb-2">So sánh phân tích</h2>
                  <p className="text-sm text-neutral-600 mb-6">Chọn hai bản thu để xem metadata và nghe song song (mở modal phát từng bản).</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-primary-800 mb-3">Lựa chọn #1</h3>
                      {renderCompareCard(leftRecording, "left")}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-800 mb-3">Lựa chọn #2</h3>
                      {renderCompareCard(rightRecording, "right")}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl border-2 border-primary-200/80 bg-white shadow-md p-4 sm:p-6"
                  style={{ backgroundColor: "#FFFCF5" }}
                >
                  <h3 className="text-lg font-semibold text-primary-800 mb-3">
                    So sánh phiên âm / lời hát
                  </h3>
                  {!leftTranscript && !rightTranscript ? (
                    <p className="text-sm text-neutral-600 mb-6">Hai bản thu chưa có transcript/lyrics để so sánh.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                      <div className="rounded-xl border border-primary-200/80 bg-white p-3">
                        <p className="text-xs font-semibold text-primary-700 mb-2">Bản #1</p>
                        <div
                          className="text-sm leading-7 text-neutral-700"
                          dangerouslySetInnerHTML={{ __html: transcriptDiff.leftHtml || "Chưa có dữ liệu" }}
                        />
                      </div>
                      <div className="rounded-xl border border-primary-200/80 bg-white p-3">
                        <p className="text-xs font-semibold text-primary-700 mb-2">Bản #2</p>
                        <div
                          className="text-sm leading-7 text-neutral-700"
                          dangerouslySetInnerHTML={{ __html: transcriptDiff.rightHtml || "Chưa có dữ liệu" }}
                        />
                      </div>
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-primary-800 mb-3">
                    Nhận xét từ chuyên gia
                  </h3>
                  {expertNotes.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      Chọn đủ 2 bản thu để hệ thống gợi ý nhận xét so sánh theo metadata đã kiểm duyệt.
                    </p>
                  ) : (
                    <ul className="text-neutral-700 leading-relaxed space-y-2 list-none pl-0">
                      {expertNotes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary-600 font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}