import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  MessageSquare,
  Network,
  GitCompare,
  Play,
  FileText,
  Check,
  Send,
  Bot,
  Lightbulb,
  Info,
  X,
  Download,
  MapPin,
  Users,
  Music2,
  CalendarDays,
  Map,
} from "lucide-react";
import BackButton from "@/components/common/BackButton";
import SearchableDropdown from "@/components/common/SearchableDropdown";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AudioPlayer from "@/components/features/AudioPlayer";
import VideoPlayer from "@/components/features/VideoPlayer";
import KnowledgeGraphViewer from "@/components/knowledge-graph/KnowledgeGraphViewer";
import { useKnowledgeGraphData } from "@/hooks/useKnowledgeGraphData";
import { INTELLIGENCE_NAME, REGION_NAMES } from "@/config/constants";
import { API_BASE_URL } from "@/config/constants";
import {
  referenceDataService,
  type EthnicGroupItem,
  type InstrumentItem,
  type CeremonyItem,
  type CommuneItem,
} from "@/services/referenceDataService";
import {
  fetchRecordingsSearchByFilter,
  type RecordingSearchByFilterQuery,
} from "@/services/researcherRecordingFilterSearch";
import { sendResearcherChatMessage } from "@/services/researcherChatService";
import { getItemAsync, setItem } from "@/services/storageService";
import { AI_RESPONSES_REVIEW_KEY } from "@/pages/ModerationPage";
import { isYouTubeUrl } from "@/utils/youtube";
import { Recording, VerificationStatus } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { normalizeSearchText } from "@/utils/searchText";

type TabId = "search" | "qa" | "graph" | "compare";
type ResearcherCatalogSource = "api-filter" | "empty";

type ResearcherFilterDropdownKey = "ethnic" | "instrument" | "ceremony" | "region" | "commune";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}

interface ChatCitation {
  recordingId: string;
  label: string;
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

interface SearchFiltersState {
  ethnicGroup: string;
  instrument: string;
  region: string;
  ceremony: string;
  commune: string;
}

function readExtraString(r: Recording, keys: string[]): string {
  const row = r as unknown as Record<string, unknown>;
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return "";
}

function getEthnicityLabel(r: Recording): string {
  return (
    r.ethnicity?.nameVietnamese ??
    r.ethnicity?.name ??
    readExtraString(r, ["ethnicityName", "ethnicGroupName", "ethnicName"])
  );
}

function getRegionLabel(r: Recording): string {
  const named = readExtraString(r, ["regionName", "regionLabel"]);
  if (named) return named;
  const fromEnum = r.region ? REGION_NAMES[r.region as keyof typeof REGION_NAMES] : "";
  if (fromEnum) return fromEnum;
  return readExtraString(r, ["region", "provinceName", "recordingLocation"]);
}

function getInstrumentLabel(r: Recording): string {
  if ((r.instruments?.length ?? 0) > 0) {
    return r.instruments
      .map((i) => i.nameVietnamese ?? i.name)
      .filter(Boolean)
      .join(", ");
  }
  const row = r as unknown as Record<string, unknown>;
  const names = row.instrumentNames;
  if (Array.isArray(names)) {
    const list = names
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    if (list.length > 0) return list.join(", ");
  }
  return "";
}

function getCeremonyLabel(r: Recording, eventTypes: string[]): string {
  const byTags = r.tags?.find((t) => t === eventTypes.find((e) => e === t) || eventTypes.some((e) => t.includes(e)));
  if (byTags) return byTags;
  const byMetadata = r.metadata?.ritualContext ?? "";
  if (byMetadata) return byMetadata;
  return readExtraString(r, ["ceremonyName", "eventTypeName", "ritualName"]);
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

const QA_DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

const createQAConversation = async (data: QAConversationRequest) => {
  try {
    await axios.post(`${API_BASE_URL}/QAConversation`, data);
  } catch (err) {
    console.error("Lỗi khi tạo conversation:", err);
  }
};

const createQAMessage = async (data: QAMessageRequest) => {
  try {
    await axios.post(`${API_BASE_URL}/QAMessage`, data);
  } catch (err) {
    console.error("Lỗi khi lưu tin nhắn:", err);
  }
};

const fetchUserConversations = async (userId: string): Promise<QAConversationRequest[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/QAConversation/get-by-user`, {
      params: { userId },
    });
    return res.data?.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy lịch sử hội thoại:", err);
    return [];
  }
};

const fetchConversationMessages = async (conversationId: string): Promise<QAMessageRequest[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/QAMessage/get-by-conversation`, {
      params: { conversationId },
    });
    return res.data?.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy tin nhắn hội thoại:", err);
    return [];
  }
};

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
  const more = [
    getRegionLabel(r),
    getInstrumentLabel(r),
    getCeremonyLabel(r, []),
    getCommuneName(r),
  ].join(" ");
  const searchable = [title, desc, ethnicityName, tags, more]
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
      const ethnicity = getEthnicityLabel(r) || "Không rõ dân tộc";
      const region = getRegionLabel(r) || "Không rõ vùng";
      return {
        recordingId: r.id,
        label: `${r.title} — ${ethnicity} — ${region}`,
      };
    });
}

export default function ResearcherPortalPage() {
  const { user } = useAuth();
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
  const [playModalRecording, setPlayModalRecording] = useState<Recording | null>(null);
  const [playModalLoading, setPlayModalLoading] = useState(false);
  const [catalogSource, setCatalogSource] = useState<ResearcherCatalogSource>("empty");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME_CHAT },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [isFirstQaMessage, setIsFirstQaMessage] = useState(true);
  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<ResearcherFilterDropdownKey | null>(null);
  const [graphView, setGraphView] = useState<"overview" | "instruments" | "ethnicity">("overview");
  const [selectedGraphNode, setSelectedGraphNode] = useState<{ type: "instrument" | "ethnicity"; name: string } | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  // Reference data from API (names for dropdowns + ids for GET /Recording/search-by-filter)
  const [ethnicRefData, setEthnicRefData] = useState<EthnicGroupItem[]>([]);
  const [instrumentRefData, setInstrumentRefData] = useState<InstrumentItem[]>([]);
  const [ceremonyRefData, setCeremonyRefData] = useState<CeremonyItem[]>([]);
  const [communeRefData, setCommuneRefData] = useState<CommuneItem[]>([]);
  const activeFilterCount = useMemo(
    () =>
      [filters.ethnicGroup, filters.instrument, filters.region, filters.ceremony, filters.commune].filter(
        (x) => Boolean(x?.trim()),
      ).length,
    [filters],
  );

  const ETHNICITIES = useMemo(() => ethnicRefData.map((e) => e.name), [ethnicRefData]);
  const REGIONS = useMemo(() => Object.values(REGION_NAMES), []);
  const EVENT_TYPES = useMemo(() => ceremonyRefData.map((c) => c.name), [ceremonyRefData]);
  const INSTRUMENTS = useMemo(() => instrumentRefData.map((i) => i.name), [instrumentRefData]);
  const COMMUNES = useMemo(() => communeRefData.map((c) => c.name), [communeRefData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ethnicGroups = await referenceDataService.getEthnicGroups();
        if (!cancelled && ethnicGroups.length > 0) setEthnicRefData(ethnicGroups);
      } catch (err) {
        console.warn("Failed to load ethnic groups", err);
      }

      try {
        const ceremonies = await referenceDataService.getCeremonies();
        if (!cancelled && ceremonies.length > 0) setCeremonyRefData(ceremonies);
      } catch (err) {
        console.warn("Failed to load ceremonies", err);
      }

      try {
        const instrumentItems = await referenceDataService.getInstruments();
        if (!cancelled && instrumentItems.length > 0) setInstrumentRefData(instrumentItems);
      } catch (err) {
        console.warn("Failed to load instruments", err);
      }
      try {
        const communes = await referenceDataService.getCommunes();
        if (!cancelled && communes.length > 0) setCommuneRefData(communes);
      } catch (err) {
        console.warn("Failed to load communes", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Knowledge graph data mapper từ bản thu đã kiểm duyệt
  const graphData = useKnowledgeGraphData(approvedRecordings, ethnicRefData, instrumentRefData, ceremonyRefData);

  const ethnicitiesList = useMemo(() => Array.from(new Set(graphData.nodes.filter(n => n.type === 'ethnic_group').map(n => n.name))).sort((a, b) => a.localeCompare(b, "vi")), [graphData.nodes]);
  const instrumentsList = useMemo(() => Array.from(new Set(graphData.nodes.filter(n => n.type === 'instrument').map(n => n.name))).sort((a, b) => a.localeCompare(b, "vi")), [graphData.nodes]);

  // Clear selected node when switching graph view to avoid stale "Bản thu liên quan".
  useEffect(() => {
    setSelectedGraphNode(null);
  }, [graphView]);

  const buildRecordingSearchQuery = useCallback((): RecordingSearchByFilterQuery => {
    const pickByNormalizedName = <T extends { name: string; id: string }>(list: T[], selected: string): string | undefined => {
      const normalizedSelected = normalizeSearchText(selected);
      if (!normalizedSelected) return undefined;
      return list.find((x) => normalizeSearchText(x.name) === normalizedSelected)?.id;
    };
    const regionCode =
      filters.region.trim().length > 0
        ? (Object.entries(REGION_NAMES) as [string, string][]).find(([, label]) => label === filters.region)?.[0]
        : undefined;
    const ethnicGroupId = pickByNormalizedName(ethnicRefData, filters.ethnicGroup);
    const instrumentId = pickByNormalizedName(instrumentRefData, filters.instrument);
    const ceremonyId = pickByNormalizedName(ceremonyRefData, filters.ceremony);
    const communeId = pickByNormalizedName(communeRefData, filters.commune);
    return {
      page: 1,
      pageSize: 500,
      q: searchQuery.trim() || undefined,
      ethnicGroupId,
      instrumentId,
      ceremonyId,
      regionCode,
      communeId,
    };
  }, [searchQuery, filters, ethnicRefData, instrumentRefData, ceremonyRefData, communeRefData]);

  const loadResearcherCatalog = useCallback(async () => {
    setSearchLoading(true);
    const q = buildRecordingSearchQuery();
    
    const logTelemetry = (source: string, count: number, extra: Record<string, unknown> = {}) => {
      if (!import.meta.env.DEV) return;
      console.info("[ResearcherSearch]", {
        source,
        count,
        query: q,
        ...extra,
      });
    };
    try {
      const apiList = await fetchRecordingsSearchByFilter(q);
      
      if (apiList && apiList.length > 0) {
        setApprovedRecordings(apiList);
        setCatalogSource("api-filter");
        logTelemetry("api-filter", apiList.length, { status: "success" });
      } else {
        setApprovedRecordings([]);
        setCatalogSource("empty");
        logTelemetry("empty", 0, { status: "no-results" });
      }
    } catch (err) {
      console.error("Researcher catalog load API failed:", err);
      setApprovedRecordings([]);
      setCatalogSource("empty");
      logTelemetry("error", 0, { status: "failed", error: String(err) });
    } finally {
      setSearchLoading(false);
    }
  }, [buildRecordingSearchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadResearcherCatalog();
    }, 280);
    return () => clearTimeout(t);
  }, [loadResearcherCatalog]);

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
    const payload = approvedRecordings.map((r) => ({
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
  }, [approvedRecordings]);

  const handleSearchClick = useCallback(() => {
    void loadResearcherCatalog();
  }, [loadResearcherCatalog]);

  const handlePlay = useCallback((recording: Recording) => {
    setPlayModalRecording(recording);
  }, []);

  const handleClosePlayModal = useCallback(() => {
    setPlayModalRecording(null);
  }, []);

  const handleDetail = useCallback(
    (target: Recording | string) => {
      const id = typeof target === "string" ? target : target.id;
      const rec = typeof target === "string" ? approvedRecordings.find((x) => x.id === target) : target;
      navigate(`/recordings/${encodeURIComponent(id)}`, {
        state: {
          from: returnTo,
          ...(rec && rec.id === id ? { preloadedRecording: rec } : {}),
        },
      });
    },
    [navigate, returnTo, approvedRecordings],
  );

  useEffect(() => {
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = user?.id || QA_DEFAULT_USER_ID;
      const conversations = await fetchUserConversations(userId);
      if (cancelled || conversations.length === 0) return;
      const latest = [...conversations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      if (!latest?.id) return;
      const remoteMsgs = await fetchConversationMessages(latest.id);
      if (cancelled || remoteMsgs.length === 0) return;
      const mapped: ChatMessage[] = remoteMsgs.map((m) => ({
        role: m.role === 0 ? "user" : "assistant",
        content: m.content,
      }));
      setConversationId(latest.id);
      setIsFirstQaMessage(false);
      setChatMessages(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

  const sendQaQuestion = useCallback(async (text: string) => {
    if (!text) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setIsTyping(true);
    try {
      const now = new Date();
      const userId = user?.id || QA_DEFAULT_USER_ID;
      const currentConversationId = conversationId;
      if (isFirstQaMessage) {
        await createQAConversation({
          id: currentConversationId,
          userId,
          title: text,
          createdAt: now.toISOString(),
        });
        setIsFirstQaMessage(false);
      }
      await createQAMessage({
        id: crypto.randomUUID(),
        conversationId: currentConversationId,
        role: 0,
        content: text,
        sourceRecordingIdsJson: "[]",
        sourceKBEntryIdsJson: "[]",
        confidenceScore: 0,
        flaggedByExpert: false,
        correctedByExpertId: null,
        expertCorrection: null,
        createdAt: now.toISOString(),
      });
      const reply = await sendResearcherChatMessage(text);
      const content = reply ?? CHAT_API_FALLBACK;
      const citations = buildCitationCandidates(text, approvedRecordings);
      setChatMessages((prev) => [...prev, { role: "assistant", content, citations }]);
      void pushAiResponseForExpertReview(text, content, citations);
      await createQAMessage({
        id: crypto.randomUUID(),
        conversationId: currentConversationId,
        role: 1,
        content,
        sourceRecordingIdsJson: "[]",
        sourceKBEntryIdsJson: "[]",
        confidenceScore: 0,
        flaggedByExpert: false,
        correctedByExpertId: null,
        expertCorrection: null,
        createdAt: new Date().toISOString(),
      });
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: CHAT_API_FALLBACK }]);
    } finally {
      setIsTyping(false);
    }
  }, [approvedRecordings, pushAiResponseForExpertReview, user?.id, conversationId, isFirstQaMessage]);

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    await sendQaQuestion(text);
  }, [chatInput, sendQaQuestion]);

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
    await sendQaQuestion(text);
  }, [sendQaQuestion]);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "search", label: "Tìm kiếm nâng cao", icon: Search },
    { id: "qa", label: "Hỏi đáp thông minh", icon: MessageSquare },
    { id: "graph", label: "Biểu đồ tri thức", icon: Network },
    { id: "compare", label: "So sánh phân tích", icon: GitCompare },
  ];

  return (
    <div className="min-h-screen min-w-0 bg-gradient-to-b from-cream-50 via-[#F9F5EF] to-secondary-50/35">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Cổng nghiên cứu
          </h1>
          <BackButton />
        </div>

        {/* Tabs */}
        <div
          className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] to-secondary-50/55 shadow-lg backdrop-blur-sm mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl min-w-0 overflow-x-hidden"
        >
          <nav
            className="flex flex-wrap gap-2 p-4 sm:p-6 lg:p-8 border-b border-secondary-200/50 bg-white/30"
            aria-label="Cổng nghiên cứu"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 ${activeTab === tab.id
                  ? "bg-gradient-to-br from-white to-secondary-50 text-primary-900 shadow-md ring-2 ring-secondary-300/70"
                  : "text-neutral-700 hover:bg-secondary-50/90 hover:text-neutral-900"
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
              <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-primary-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
                    Tìm kiếm ngữ nghĩa
                  </h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    Nhập từ khóa tự nhiên để hệ thống gợi ý bản ghi phù hợp.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2.5} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchClick();
                      }}
                      placeholder='Ví dụ: "Tìm bài hát mùa màng dùng đàn bầu ở Tây Nam Bộ"'
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-neutral-900 placeholder-neutral-500 bg-white"
                      aria-label="Tìm kiếm ngữ nghĩa"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchClick}
                    disabled={searchLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 disabled:opacity-80 disabled:cursor-wait text-white font-semibold shadow-xl shadow-primary-600/40 hover:shadow-2xl transition-all cursor-pointer min-w-[132px]"
                    aria-busy={searchLoading}
                  >
                    <Search className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                    <span>{searchLoading ? "Đang tìm..." : "Tìm kiếm"}</span>
                  </button>
                </div>
              </div>

              {/* Bộ lọc — một menu mở tại một thời điểm (controlled SearchableDropdown) */}
              <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-[#FFFCF5] via-white to-primary-50/30 shadow-sm p-5 sm:p-6">
                <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-primary-800 tracking-tight">Bộ lọc nâng cao</h3>
                    <p className="text-xs text-neutral-500 mt-1">Lọc nhanh theo metadata đã xác minh.</p>
                    {activeFilterCount > 0 && (
                      <p className="text-[11px] text-primary-700 mt-1">Đang áp dụng {activeFilterCount} bộ lọc</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        ethnicGroup: "",
                        instrument: "",
                        region: "",
                        ceremony: "",
                        commune: "",
                      })
                    }
                    disabled={activeFilterCount === 0}
                    className="text-xs px-3 py-1.5 rounded-lg border border-primary-200/80 text-primary-700 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
                  {(
                    [
                      {
                        key: "ethnic" as const,
                        label: "Dân tộc",
                        icon: Users,
                        placeholder: "Tất cả dân tộc",
                        value: filters.ethnicGroup,
                        onChange: (v: string) => setFilters((p) => ({ ...p, ethnicGroup: v })),
                        options: ETHNICITIES,
                        searchable: true,
                      },
                      {
                        key: "instrument" as const,
                        label: "Nhạc cụ",
                        icon: Music2,
                        placeholder: "Tất cả nhạc cụ",
                        value: filters.instrument,
                        onChange: (v: string) => setFilters((p) => ({ ...p, instrument: v })),
                        options: INSTRUMENTS,
                        searchable: true,
                      },
                      {
                        key: "ceremony" as const,
                        label: "Nghi lễ",
                        icon: CalendarDays,
                        placeholder: "Tất cả nghi lễ",
                        value: filters.ceremony,
                        onChange: (v: string) => setFilters((p) => ({ ...p, ceremony: v })),
                        options: EVENT_TYPES,
                        searchable: false,
                      },
                      {
                        key: "region" as const,
                        label: "Vùng miền",
                        icon: Map,
                        placeholder: "Tất cả vùng miền",
                        value: filters.region,
                        onChange: (v: string) => setFilters((p) => ({ ...p, region: v })),
                        options: REGIONS,
                        searchable: false,
                      },
                      {
                        key: "commune" as const,
                        label: "Xã / Phường",
                        icon: MapPin,
                        placeholder: "Tất cả xã / phường",
                        value: filters.commune,
                        onChange: (v: string) => setFilters((p) => ({ ...p, commune: v })),
                        options: COMMUNES,
                        searchable: true,
                      },
                    ] as const
                  ).map((field) => {
                    const Icon = field.icon;
                    return (
                      <div
                        key={field.key}
                        className="flex flex-col gap-2 min-h-0 rounded-xl border border-neutral-200/75 bg-white/90 p-3.5 sm:p-4 shadow-sm hover:border-primary-200/80 hover:shadow transition-all"
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 select-none">
                          <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" strokeWidth={2.25} aria-hidden />
                          <span className="truncate">{field.label}</span>
                        </label>
                        <SearchableDropdown
                          value={field.value}
                          onChange={field.onChange}
                          options={field.options}
                          placeholder={field.placeholder}
                          searchable={field.searchable}
                          isOpen={filterDropdownOpen === field.key}
                          onOpenChange={(open) => setFilterDropdownOpen(open ? field.key : null)}
                        />
                      </div>
                    );
                  })}
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
                      : `Tìm thấy ${approvedRecordings.length} bản ghi đã kiểm duyệt`}
                  </span>
                  {!searchLoading && (
                    <span className="text-[11px] text-neutral-500">
                      Nguồn: {catalogSource === "api-filter" ? "API filter" : "Không có dữ liệu"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleExportDataset}
                    disabled={searchLoading || approvedRecordings.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-300/70 bg-gradient-to-br from-secondary-100 to-secondary-200/70 text-sm font-semibold text-primary-900 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
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
              ) : (
                <div className="space-y-4">
                  {approvedRecordings.length === 0 ? (
                    <p className="text-neutral-600 py-8 text-center">
                      Không có bản thu nào khớp với bộ lọc hoặc từ khóa. Chỉ hiển thị bản thu đã được chuyên gia kiểm duyệt.
                    </p>
                  ) : (
                    approvedRecordings.map((result, resultIdx) => (
                      (() => {
                        const ethnicValue = getEthnicityLabel(result);
                        const regionValue = getRegionLabel(result);
                        const instrumentValue = getInstrumentLabel(result);
                        const ceremonyValue = getCeremonyLabel(result, EVENT_TYPES);
                        const communeValue = getCommuneName(result);

                        const metadataPairs = [
                          { label: "Dân tộc", value: ethnicValue },
                          { label: "Vùng miền", value: regionValue },
                          { label: "Nhạc cụ", value: instrumentValue },
                          { label: "Nghi lễ", value: ceremonyValue },
                          { label: "Xã/Phường", value: communeValue },
                        ].filter((x) => Boolean(x.value));

                        const missingMetadataCount = 5 - metadataPairs.length;

                        return (
                          <div
                            key={result.id ?? `${result.title ?? "recording"}-${resultIdx}`}
                            className="group relative overflow-hidden rounded-2xl border border-secondary-200/60 bg-white/70 backdrop-blur-md p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-secondary-300 transition-all duration-300 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-gradient-to-b before:from-primary-400 before:to-secondary-500"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 sm:gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                                  <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary-700 transition-colors leading-tight">
                                    {result.title}
                                  </h3>
                                  {result.verificationStatus === VerificationStatus.VERIFIED && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                      Đã xác minh
                                    </span>
                                  )}
                                  {missingMetadataCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                      Thiếu metadata
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                  {(metadataPairs.length > 0
                                    ? metadataPairs
                                    : [
                                        { label: "Dân tộc", value: "Chưa cập nhật" },
                                        { label: "Vùng miền", value: "Chưa cập nhật" },
                                        { label: "Nhạc cụ", value: "Chưa cập nhật" },
                                        { label: "Nghi lễ", value: "Chưa cập nhật" },
                                        { label: "Xã/Phường", value: "Chưa cập nhật" },
                                      ]).map((item) => (
                                    <span
                                      key={`${result.id}-${item.label}`}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                                        item.value === "Chưa cập nhật"
                                          ? "border-neutral-200/60 bg-neutral-50/50 text-neutral-500 hover:bg-neutral-100"
                                          : "border-neutral-200/70 bg-neutral-50/80 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/80"
                                      }`}
                                      title={`${item.label}: ${item.value}`}
                                    >
                                      <span className="text-neutral-500">{item.label}:</span>
                                      <span className="max-w-[280px] truncate font-semibold text-neutral-800">{item.value}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2.5 sm:flex-shrink-0 pt-2 sm:pt-0">
                                <button
                                  type="button"
                                  onClick={() => handlePlay(result)}
                                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/20 transition-all cursor-pointer"
                                >
                                  <Play className="w-4 h-4 fill-white" strokeWidth={2} />
                                  Phát
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDetail(result)}
                                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold text-sm shadow-sm transition-all cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" strokeWidth={2.5} />
                                  Chi tiết
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()
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
                <div className="lg:col-span-2 flex flex-col rounded-2xl border border-secondary-200/50 bg-gradient-to-b from-[#FFFCF5] to-secondary-50/55 shadow-lg backdrop-blur-sm overflow-hidden min-h-[500px] max-h-[700px]">
                  <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-4 sm:px-6 py-4 border-b border-primary-800">
                    <h2 className="text-lg font-semibold">VietTune Intelligence</h2>
                    <p className="text-secondary-200 text-sm mt-0.5">
                      Hệ thống được đào tạo trên cơ sở tri thức đã xác minh
                    </p>
                  </div>
                  <div
                    ref={chatListRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user"
                            ? "bg-primary-600 text-white shadow-md"
                            : "bg-white border border-secondary-200/50 text-neutral-700 shadow-sm"
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
                                      onClick={() =>
                                        handleDetail(
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
                        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-neutral-900 placeholder-neutral-500 bg-white"
                        aria-label="Tin nhắn"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void handleSendMessage();
                        }}
                        disabled={!chatInput.trim() || isTyping}
                        className="p-2.5 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-md disabled:opacity-50 disabled:pointer-events-none text-white transition-all cursor-pointer"
                        aria-label="Gửi"
                      >
                        <Send className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div
                    className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4"
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
                className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6"
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
                    className="relative w-full overflow-hidden"
                    style={{ height: "min(600px, 70vh)" }}
                  >
                    <KnowledgeGraphViewer 
                        data={graphData} 
                        onNodeClick={(node) => {
                           if (node.type === 'instrument' || node.type === 'ethnic_group') {
                               setSelectedGraphNode({ type: node.type === 'ethnic_group' ? 'ethnicity' : 'instrument', name: node.name });
                               setGraphView(node.type === 'instrument' ? 'instruments' : 'ethnicity');
                           }
                        }} 
                    />
                  </div>
                )}

                {(graphView === "instruments" || graphView === "ethnicity") && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Danh sách: Nhạc cụ hoặc Dân tộc */}
                    <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm max-h-[min(500px,60vh)] overflow-y-auto">
                      <h3 className="text-sm font-semibold text-primary-800 mb-2 sticky top-0 bg-white py-1 z-10">
                        {graphView === "instruments" ? `Danh sách nhạc cụ (${instrumentsList.length})` : `Danh sách dân tộc (${ethnicitiesList.length})`}
                      </h3>
                      <ul className="space-y-1 text-sm text-neutral-700">
                        {(graphView === "instruments" ? instrumentsList : ethnicitiesList).map((name, idx) => (
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
                      {((graphView === "instruments" && instrumentsList.length === 0) || (graphView === "ethnicity" && ethnicitiesList.length === 0)) && (
                        <p className="text-neutral-500 text-xs">Chưa có dữ liệu từ bản thu đã kiểm duyệt.</p>
                      )}
                    </div>
                    {/* Đồ thị hai cột: Dân tộc – Nhạc cụ, nối theo cạnh (nhạc cụ của dân tộc nào) */}
                    <div
                      className="lg:col-span-3 relative w-full overflow-hidden"
                      style={{ height: "min(500px, 60vh)" }}
                    >
                      {graphData.nodes.length === 0 ? (
                        <p className="text-neutral-600 text-center px-4">
                          Chưa đủ dữ liệu để vẽ đồ thị. 
                        </p>
                      ) : (
                        <KnowledgeGraphViewer 
                            data={graphData} 
                            onNodeClick={(node) => {
                               if (node.type === 'instrument' || node.type === 'ethnic_group') {
                                   setSelectedGraphNode({ type: node.type === 'ethnic_group' ? 'ethnicity' : 'instrument', name: node.name });
                               }
                            }} 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {(graphView === "instruments" || graphView === "ethnicity") &&
                selectedGraphNode &&
                selectedGraphNode.type === (graphView === "instruments" ? "instrument" : "ethnicity") && (
                <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-primary-800 mb-3">
                    Bản thu liên quan: {selectedGraphNode.name}
                  </h3>
                  {graphRelatedRecordings.length === 0 ? (
                    <p className="text-sm text-neutral-600">Chưa có bản thu phù hợp với nút đã chọn.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {graphRelatedRecordings.slice(0, 8).map((r, idx) => (
                        <button
                          key={r.id ?? `${r.title ?? "recording"}-${idx}`}
                          type="button"
                          onClick={() => handleDetail(r)}
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
                  { label: "Dân tộc (trong đồ thị)", value: String(ethnicitiesList.length), className: "bg-gradient-to-br from-primary-50 to-red-50 border-primary-200/80", valueColor: "text-primary-800" },
                  { label: "Nhạc cụ (trong đồ thị)", value: String(instrumentsList.length), className: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/80", valueColor: "text-amber-900" },
                  { label: "Mối quan hệ (cạnh)", value: String(graphData.links.length), className: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/80", valueColor: "text-emerald-800" },
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
                <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
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
                  className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6"
                >
                  <h3 className="text-lg font-semibold text-primary-800 mb-3">
                    So sánh phiên âm / lời hát
                  </h3>
                  {!leftTranscript && !rightTranscript ? (
                    <p className="text-sm text-neutral-600 mb-6">Hai bản thu chưa có transcript/lyrics để so sánh.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                      <div className="rounded-xl border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] via-cream-50/80 to-secondary-50/45 p-3">
                        <p className="text-xs font-semibold text-primary-700 mb-2">Bản #1</p>
                        <div
                          className="text-sm leading-7 text-neutral-700"
                          dangerouslySetInnerHTML={{ __html: transcriptDiff.leftHtml || "Chưa có dữ liệu" }}
                        />
                      </div>
                      <div className="rounded-xl border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] via-cream-50/80 to-secondary-50/45 p-3">
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