import { Search, MessageSquare, Network, GitCompare, X, BookOpen } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';

import { legacyGet, legacyPost } from '@/api/legacyHttp';
import BackButton from '@/components/common/BackButton';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AudioPlayer from '@/components/features/AudioPlayer';
import KnowledgeBasePanel from '@/components/features/kb/KnowledgeBasePanel';
import ExportDatasetDialog from '@/components/features/research/ExportDatasetDialog';
import VideoPlayer from '@/components/features/VideoPlayer';
import ResearcherExportPanel from '@/components/researcher/ResearcherExportPanel';
import ResearcherFilterBar from '@/components/researcher/ResearcherFilterBar';
import ResearcherPortalCompareTab from '@/components/researcher/ResearcherPortalCompareTab';
import ResearcherPortalGraphTab from '@/components/researcher/ResearcherPortalGraphTab';
import ResearcherPortalQATab from '@/components/researcher/ResearcherPortalQATab';
import ResearcherRecordingList from '@/components/researcher/ResearcherRecordingList';
import { useAuth } from '@/contexts/AuthContext';
import { useKnowledgeGraphData } from '@/features/knowledge-graph/hooks/useKnowledgeGraphData';
import { useResearcherData } from '@/features/researcher/hooks/useResearcherData';
import type {
  ResearcherGraphTabView,
  ResearcherPortalChatMessage,
  ResearcherSelectedGraphNode,
} from '@/features/researcher/researcherPortalTypes';
import { buildCitationCandidates } from '@/features/researcher/researcherRecordingUtils';
import { sendResearcherChatMessage } from '@/services/researcherChatService';
import { Recording, UserRole } from '@/types';
import { isYouTubeUrl } from '@/utils/youtube';

type TabId = 'search' | 'qa' | 'graph' | 'compare' | 'kb';

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

const WELCOME_CHAT =
  'Xin chào! Tôi có thể giúp bạn tìm hiểu về âm nhạc truyền thống Việt Nam. Hãy đặt câu hỏi về nhạc cụ, nghi lễ, hoặc phong cách âm nhạc của các dân tộc.';

const CHAT_API_FALLBACK =
  'Hiện không kết nối được với VietTune Intelligence. Bạn vẫn có thể xem thông tin từ phần Tìm kiếm nâng cao và Biểu đồ tri thức.';

const QA_DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

const createQAConversation = async (data: QAConversationRequest) => {
  try {
    await legacyPost('/QAConversation', data);
  } catch (err) {
    console.error('Lỗi khi tạo conversation:', err);
  }
};

const createQAMessage = async (data: QAMessageRequest) => {
  try {
    await legacyPost('/QAMessage', data);
  } catch (err) {
    console.error('Lỗi khi lưu tin nhắn:', err);
  }
};

const fetchUserConversations = async (userId: string): Promise<QAConversationRequest[]> => {
  try {
    const res = await legacyGet<{ data?: QAConversationRequest[] }>('/QAConversation/get-by-user', {
      params: { userId },
    });
    return res?.data ?? [];
  } catch (err) {
    console.error('Lỗi khi lấy lịch sử hội thoại:', err);
    return [];
  }
};

const fetchConversationMessages = async (conversationId: string): Promise<QAMessageRequest[]> => {
  try {
    const res = await legacyGet<{ data?: QAMessageRequest[] }>('/QAMessage/get-by-conversation', {
      params: { conversationId },
    });
    return res?.data ?? [];
  } catch (err) {
    console.error('Lỗi khi lấy tin nhắn hội thoại:', err);
    return [];
  }
};

export default function ResearcherPortalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.pathname;

  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    approvedRecordings,
    searchLoading,
    catalogSource,
    ethnicRefData,
    instrumentRefData,
    ceremonyRefData,
    activeFilterCount,
    ETHNICITIES,
    REGIONS,
    EVENT_TYPES,
    INSTRUMENTS,
    COMMUNES,
    handleSearchClick,
  } = useResearcherData();

  const [activeTab, setActiveTab] = useState<TabId>('search');
  const [playModalRecording, setPlayModalRecording] = useState<Recording | null>(null);
  const [playModalLoading, setPlayModalLoading] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<ResearcherPortalChatMessage[]>([
    { role: 'assistant', content: WELCOME_CHAT },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [isFirstQaMessage, setIsFirstQaMessage] = useState(true);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const [graphView, setGraphView] = useState<ResearcherGraphTabView>('overview');
  const [selectedGraphNode, setSelectedGraphNode] = useState<ResearcherSelectedGraphNode>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  // Knowledge graph data mapper từ bản thu đã kiểm duyệt
  const graphData = useKnowledgeGraphData(
    approvedRecordings,
    ethnicRefData,
    instrumentRefData,
    ceremonyRefData,
  );

  const ethnicitiesList = useMemo(
    () =>
      Array.from(
        new Set(graphData.nodes.filter((n) => n.type === 'ethnic_group').map((n) => n.name)),
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [graphData.nodes],
  );
  const instrumentsList = useMemo(
    () =>
      Array.from(
        new Set(graphData.nodes.filter((n) => n.type === 'instrument').map((n) => n.name)),
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [graphData.nodes],
  );

  // Clear selected node when switching graph view to avoid stale "Bản thu liên quan".
  useEffect(() => {
    setSelectedGraphNode(null);
  }, [graphView]);

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
    if (selectedGraphNode.type === 'instrument') {
      return approvedRecordings.filter((r) =>
        r.instruments?.some((i) => (i.nameVietnamese ?? i.name) === selectedGraphNode.name),
      );
    }
    return approvedRecordings.filter(
      (r) => (r.ethnicity?.nameVietnamese ?? r.ethnicity?.name) === selectedGraphNode.name,
    );
  }, [approvedRecordings, selectedGraphNode]);

  const handlePlay = useCallback((recording: Recording) => {
    setPlayModalRecording(recording);
  }, []);

  const handleClosePlayModal = useCallback(() => {
    setPlayModalRecording(null);
  }, []);

  const handleDetail = useCallback(
    (target: Recording | string) => {
      const id = typeof target === 'string' ? target : target.id;
      const rec =
        typeof target === 'string' ? approvedRecordings.find((x) => x.id === target) : target;
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
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const userId = user?.id || QA_DEFAULT_USER_ID;
      const conversations = await fetchUserConversations(userId);
      if (cancelled || conversations.length === 0) return;
      const latest = [...conversations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      if (!latest?.id) return;
      const remoteMsgs = await fetchConversationMessages(latest.id);
      if (cancelled || remoteMsgs.length === 0) return;
      const mapped: ResearcherPortalChatMessage[] = remoteMsgs.map((m) => ({
        role: m.role === 0 ? 'user' : 'assistant',
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

  const sendQaQuestion = useCallback(
    async (text: string) => {
      if (!text) return;
      setChatMessages((prev) => [...prev, { role: 'user', content: text }]);
      setChatInput('');
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
          sourceRecordingIdsJson: '[]',
          sourceKBEntryIdsJson: '[]',
          confidenceScore: 0,
          flaggedByExpert: false,
          correctedByExpertId: null,
          expertCorrection: null,
          createdAt: now.toISOString(),
        });
        const reply = await sendResearcherChatMessage(text);
        const content = reply ?? CHAT_API_FALLBACK;
        const citations = buildCitationCandidates(text, approvedRecordings);
        setChatMessages((prev) => [...prev, { role: 'assistant', content, citations }]);
        await createQAMessage({
          id: crypto.randomUUID(),
          conversationId: currentConversationId,
          role: 1,
          content,
          sourceRecordingIdsJson: '[]',
          sourceKBEntryIdsJson: '[]',
          confidenceScore: 0,
          flaggedByExpert: false,
          correctedByExpertId: null,
          expertCorrection: null,
          createdAt: new Date().toISOString(),
        });
      } catch {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: CHAT_API_FALLBACK }]);
      } finally {
        setIsTyping(false);
      }
    },
    [approvedRecordings, user?.id, conversationId, isFirstQaMessage],
  );

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    await sendQaQuestion(text);
  }, [chatInput, sendQaQuestion]);

  const handleQaKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      try {
        await handleSendMessage();
      } catch {
        // Safety net: handleSendMessage already catches, but avoid floating-promise/unhandled rejections.
        setChatMessages((prev) => [...prev, { role: 'assistant', content: CHAT_API_FALLBACK }]);
        setIsTyping(false);
      }
    }
  };

  const askQuestion = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text) return;
      await sendQaQuestion(text);
    },
    [sendQaQuestion],
  );

  const showExpertKbTab = user?.role === UserRole.EXPERT;

  useEffect(() => {
    if (!showExpertKbTab && activeTab === 'kb') {
      setActiveTab('search');
    }
  }, [showExpertKbTab, activeTab]);

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string; icon: React.ElementType }[] = [
      { id: 'search', label: 'Tìm kiếm nâng cao', icon: Search },
      { id: 'qa', label: 'Hỏi đáp thông minh', icon: MessageSquare },
      { id: 'graph', label: 'Biểu đồ tri thức', icon: Network },
      { id: 'compare', label: 'So sánh phân tích', icon: GitCompare },
    ];
    if (showExpertKbTab) {
      base.push({ id: 'kb', label: 'Cơ sở tri thức', icon: BookOpen });
    }
    return base;
  }, [showExpertKbTab]);

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Cổng nghiên cứu
          </h1>
          <BackButton />
        </div>

        {/* Tabs */}
        <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel to-secondary-50/55 shadow-lg backdrop-blur-sm mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl min-w-0 overflow-x-hidden">
          <nav
            className="flex flex-wrap gap-2 p-4 sm:p-6 lg:p-8 border-b border-secondary-200/50 bg-white/30"
            aria-label="Cổng nghiên cứu"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-br from-white to-secondary-50 text-primary-900 shadow-md ring-2 ring-secondary-300/70'
                    : 'text-neutral-700 hover:bg-secondary-50/90 hover:text-neutral-900'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab: Tìm kiếm nâng cao */}
          {activeTab === 'search' && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
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
                    <Search
                      className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2"
                      strokeWidth={2.5}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchClick();
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
                    <span>{searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}</span>
                  </button>
                </div>
              </div>

              <ResearcherFilterBar
                filters={filters}
                setFilters={setFilters}
                activeFilterCount={activeFilterCount}
                ETHNICITIES={ETHNICITIES}
                REGIONS={REGIONS}
                EVENT_TYPES={EVENT_TYPES}
                INSTRUMENTS={INSTRUMENTS}
                COMMUNES={COMMUNES}
              />

              {/* Kết quả — chỉ bản thu đã được expert kiểm duyệt */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-primary-800">
                  Kết quả tìm kiếm
                </h2>
                <ResearcherExportPanel
                  searchLoading={searchLoading}
                  approvedRecordingsCount={approvedRecordings.length}
                  catalogSource={catalogSource}
                  onOpenExport={() => setShowExportDialog(true)}
                />
              </div>

              <ResearcherRecordingList
                searchLoading={searchLoading}
                approvedRecordings={approvedRecordings}
                eventTypes={EVENT_TYPES}
                onPlay={handlePlay}
                onDetail={handleDetail}
              />

              {/* Modal Phát — render qua createPortal vào document.body để overlay phủ toàn trang (navbar + footer) */}
              {playModalRecording &&
                createPortal(
                  <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="play-modal-title"
                    style={{
                      animation: 'fadeIn 0.3s ease-out',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: '100vw',
                      height: '100vh',
                      position: 'fixed',
                    }}
                    onClick={handleClosePlayModal}
                  >
                    <div
                      className="relative rounded-2xl border border-neutral-300/80 bg-white shadow-2xl backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 pointer-events-auto transform"
                      style={{ animation: 'slideUp 0.3s ease-out' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                        <h2
                          id="play-modal-title"
                          className="text-lg font-semibold text-neutral-900 truncate pr-2"
                        >
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
                            const isVideo = mediaSrc
                              ? isYouTubeUrl(mediaSrc) ||
                                mediaSrc.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i) ||
                                mediaSrc.startsWith('data:video/')
                              : false;

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
                  document.body,
                )}
              <ExportDatasetDialog
                open={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                recordings={approvedRecordings}
              />
            </div>
          )}

          {/* Tab: Hỏi đáp thông minh */}
          {activeTab === 'qa' && (
            <ResearcherPortalQATab
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isTyping={isTyping}
              chatListRef={chatListRef}
              onSendMessage={handleSendMessage}
              onQaKeyDown={handleQaKeyDown}
              onQuickQuestion={askQuestion}
              onCitationClick={handleDetail}
              approvedRecordings={approvedRecordings}
            />
          )}

          {/* Tab: Biểu đồ tri thức (knowledge graph: dân tộc – nhạc cụ từ bản thu đã kiểm duyệt) */}
          {activeTab === 'graph' && (
            <ResearcherPortalGraphTab
              graphData={graphData}
              graphView={graphView}
              setGraphView={setGraphView}
              selectedGraphNode={selectedGraphNode}
              setSelectedGraphNode={setSelectedGraphNode}
              ethnicitiesList={ethnicitiesList}
              instrumentsList={instrumentsList}
              graphRelatedRecordings={graphRelatedRecordings}
              onRecordingDetail={handleDetail}
            />
          )}

          {/* Tab: So sánh phân tích — chọn 2 bản thu, xem metadata thật, phát song song (mở modal) */}
          {activeTab === 'compare' && (
            <ResearcherPortalCompareTab
              approvedRecordings={approvedRecordings}
              compareLeftId={compareLeftId}
              compareRightId={compareRightId}
              setCompareLeftId={setCompareLeftId}
              setCompareRightId={setCompareRightId}
            />
          )}

          {activeTab === 'kb' && showExpertKbTab && (
            <div className="p-4 sm:p-6 lg:p-8">
              <KnowledgeBasePanel embedded />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
