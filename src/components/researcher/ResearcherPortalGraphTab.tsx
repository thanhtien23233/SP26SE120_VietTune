import React from 'react';

import KnowledgeGraphViewer from '@/features/knowledge-graph/components/KnowledgeGraphViewer';
import type {
  ResearcherGraphTabView,
  ResearcherSelectedGraphNode,
} from '@/features/researcher/researcherPortalTypes';
import { Recording } from '@/types';
import type { KnowledgeGraphData } from '@/types/graph';

export interface ResearcherPortalGraphTabProps {
  graphData: KnowledgeGraphData;
  graphView: ResearcherGraphTabView;
  setGraphView: React.Dispatch<React.SetStateAction<ResearcherGraphTabView>>;
  selectedGraphNode: ResearcherSelectedGraphNode;
  setSelectedGraphNode: React.Dispatch<React.SetStateAction<ResearcherSelectedGraphNode>>;
  ethnicitiesList: string[];
  instrumentsList: string[];
  graphRelatedRecordings: Recording[];
  onRecordingDetail: (recording: Recording) => void;
}

export default function ResearcherPortalGraphTab({
  graphData,
  graphView,
  setGraphView,
  selectedGraphNode,
  setSelectedGraphNode,
  ethnicitiesList,
  instrumentsList,
  graphRelatedRecordings,
  onRecordingDetail,
}: ResearcherPortalGraphTabProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-800">
            Biểu đồ tri thức tương tác
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGraphView('overview')}
              className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md cursor-pointer transition-colors ${
                graphView === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              Tổng quan
            </button>
            <button
              type="button"
              onClick={() => setGraphView('instruments')}
              className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md cursor-pointer transition-colors ${
                graphView === 'instruments'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              Nhạc cụ
            </button>
            <button
              type="button"
              onClick={() => setGraphView('ethnicity')}
              className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md cursor-pointer transition-colors ${
                graphView === 'ethnicity'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              Dân tộc
            </button>
          </div>
        </div>

        {graphView === 'overview' && (
          <div className="relative w-full overflow-hidden" style={{ height: 'min(600px, 70vh)' }}>
            <KnowledgeGraphViewer
              data={graphData}
              onNodeClick={(node) => {
                if (node.type === 'instrument' || node.type === 'ethnic_group') {
                  setSelectedGraphNode({
                    type: node.type === 'ethnic_group' ? 'ethnicity' : 'instrument',
                    name: node.name,
                  });
                  setGraphView(node.type === 'instrument' ? 'instruments' : 'ethnicity');
                }
              }}
            />
          </div>
        )}

        {(graphView === 'instruments' || graphView === 'ethnicity') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border-2 border-secondary-200/80 bg-white p-4 shadow-sm max-h-[min(500px,60vh)] overflow-y-auto">
              <h3 className="text-sm font-semibold text-primary-800 mb-2 sticky top-0 bg-white py-1 z-10">
                {graphView === 'instruments'
                  ? `Danh sách nhạc cụ (${instrumentsList.length})`
                  : `Danh sách dân tộc (${ethnicitiesList.length})`}
              </h3>
              <ul className="space-y-1 text-sm text-neutral-700">
                {(graphView === 'instruments' ? instrumentsList : ethnicitiesList).map(
                  (name, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        className={`w-full truncate text-left px-2 py-1.5 rounded-lg transition-colors ${
                          selectedGraphNode?.name === name
                            ? 'bg-primary-100 text-primary-800 font-semibold'
                            : 'hover:bg-neutral-100'
                        }`}
                        title={name}
                        onClick={() =>
                          setSelectedGraphNode({
                            type: graphView === 'instruments' ? 'instrument' : 'ethnicity',
                            name,
                          })
                        }
                      >
                        {name}
                      </button>
                    </li>
                  ),
                )}
              </ul>
              {((graphView === 'instruments' && instrumentsList.length === 0) ||
                (graphView === 'ethnicity' && ethnicitiesList.length === 0)) && (
                <p className="text-neutral-500 text-xs">Chưa có dữ liệu từ bản thu đã kiểm duyệt.</p>
              )}
            </div>
            <div
              className="lg:col-span-3 relative w-full overflow-hidden"
              style={{ height: 'min(500px, 60vh)' }}
            >
              {graphData.nodes.length === 0 ? (
                <p className="text-neutral-600 text-center px-4">Chưa đủ dữ liệu để vẽ đồ thị.</p>
              ) : (
                <KnowledgeGraphViewer
                  data={graphData}
                  onNodeClick={(node) => {
                    if (node.type === 'instrument' || node.type === 'ethnic_group') {
                      setSelectedGraphNode({
                        type: node.type === 'ethnic_group' ? 'ethnicity' : 'instrument',
                        name: node.name,
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {(graphView === 'instruments' || graphView === 'ethnicity') &&
        selectedGraphNode &&
        selectedGraphNode.type === (graphView === 'instruments' ? 'instrument' : 'ethnicity') && (
          <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 shadow-lg backdrop-blur-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-primary-800 mb-3">
              Bản thu liên quan: {selectedGraphNode.name}
            </h3>
            {graphRelatedRecordings.length === 0 ? (
              <p className="text-sm text-neutral-600">Chưa có bản thu phù hợp với nút đã chọn.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {graphRelatedRecordings.slice(0, 8).map((r, idx) => (
                  <button
                    key={r.id ?? `${r.title ?? 'recording'}-${idx}`}
                    type="button"
                    onClick={() => onRecordingDetail(r)}
                    className="text-left rounded-xl border border-primary-200/80 bg-primary-50/50 px-4 py-3 hover:bg-primary-100/70 transition-colors cursor-pointer"
                  >
                    <p className="font-semibold text-primary-800 truncate">{r.title}</p>
                    <p className="text-xs text-neutral-600 truncate">
                      {r.ethnicity?.nameVietnamese ?? r.ethnicity?.name ?? '—'} •{' '}
                      {r.instruments
                        ?.map((i) => i.nameVietnamese ?? i.name)
                        .slice(0, 2)
                        .join(', ') || '—'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Dân tộc (trong đồ thị)',
            value: String(ethnicitiesList.length),
            className: 'bg-gradient-to-br from-primary-50 to-red-50 border-primary-200/80',
            valueColor: 'text-primary-800',
          },
          {
            label: 'Nhạc cụ (trong đồ thị)',
            value: String(instrumentsList.length),
            className: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/80',
            valueColor: 'text-amber-900',
          },
          {
            label: 'Mối quan hệ (cạnh)',
            value: String(graphData.links.length),
            className: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/80',
            valueColor: 'text-emerald-800',
          },
          {
            label: 'Nguồn',
            value: 'Bản thu đã kiểm duyệt',
            className: 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200/80',
            valueColor: 'text-sky-800',
          },
        ].map((stat, idx) => (
          <div key={idx} className={`rounded-xl border-2 p-4 shadow-sm ${stat.className}`}>
            <p className="text-sm text-neutral-600 font-medium mb-0.5">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
