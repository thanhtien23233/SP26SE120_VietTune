import { Bot, Database, Flag, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminAiMonitoringStatGrid } from '@/components/admin/AdminStatsCards';
import FlaggedResponseList from '@/components/features/ai/FlaggedResponseList';
import type { ExpertPerformanceRow } from '@/features/admin/adminDashboardTypes';

export default function AdminDashboardAiMonitoringPanel({
  avgExpertAccuracy,
  aiFlaggedCount,
  remoteKbCount,
  expertPerformanceRows,
  onFlaggedCountChange,
  currentUserId,
}: {
  avgExpertAccuracy: number | null;
  aiFlaggedCount: number | null;
  remoteKbCount: number | null;
  expertPerformanceRows: ExpertPerformanceRow[] | null;
  onFlaggedCountChange: (n: number) => void;
  currentUserId?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
        <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
          <Bot className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
        </div>
        Giám sát hệ thống AI
      </h2>
      <p className="text-neutral-700 font-medium leading-relaxed mb-6">
        Theo dõi hiệu suất chatbot, xử lý cảnh báo (câu trả lời bị cắm cờ), và quản lý cập nhật cơ sở
        tri thức để huấn luyện lại.
      </p>

      <AdminAiMonitoringStatGrid
        avgExpertAccuracy={avgExpertAccuracy}
        aiFlaggedCount={aiFlaggedCount}
        remoteKbCount={remoteKbCount}
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
          <h3 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            Hiệu suất chuyên gia (AI)
          </h3>
          <p className="text-neutral-700 font-medium leading-relaxed mb-4">
            Dữ liệu tổng hợp từ API phân tích chuyên gia trong 30 ngày gần nhất.
          </p>
          {expertPerformanceRows && expertPerformanceRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-700">
                    <th className="px-3 py-2 text-left font-semibold">Chuyên gia</th>
                    <th className="px-3 py-2 text-right font-semibold">Reviews</th>
                    <th className="px-3 py-2 text-right font-semibold">Accuracy</th>
                    <th className="px-3 py-2 text-left font-semibold">Avg time</th>
                  </tr>
                </thead>
                <tbody>
                  {expertPerformanceRows.map((row) => (
                    <tr key={row.expertId} className="border-t border-neutral-200 text-neutral-800">
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 text-right">{row.reviews}</td>
                      <td className="px-3 py-2 text-right">{row.accuracy.toFixed(1)}%</td>
                      <td className="px-3 py-2">{row.avgTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200/80 p-4 text-sm text-neutral-600 font-medium bg-surface-panel">
              Chưa có dữ liệu hiệu suất chuyên gia.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
          <h3 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-700" strokeWidth={2.5} />
            Xử lý cảnh báo AI
          </h3>
          <p className="text-neutral-700 font-medium leading-relaxed mb-4">
            Danh sách các phản hồi chatbot bị người dùng/chuyên gia báo cáo để Quản trị viên rà
            soát, phân loại, và quyết định cập nhật cơ sở tri thức.
          </p>
          <FlaggedResponseList onFlaggedCountChange={onFlaggedCountChange} currentUserId={currentUserId} />
        </div>

        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
          <h3 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
            Cập nhật dữ liệu AI (cơ sở tri thức)
          </h3>
          <p className="text-neutral-700 font-medium leading-relaxed mb-4">
            Quản lý các gói cập nhật tri thức: thêm/sửa/xóa tài liệu, theo dõi phiên bản và kích hoạt
            huấn luyện lại.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/knowledge-base', { state: { kbOpenCreate: true } })}
              className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
            >
              Quản lý cơ sở tri thức
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/knowledge-base')}
              className="px-4 py-2 rounded-full border border-neutral-200/80 text-neutral-800 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-surface-panel"
            >
              Mở danh sách bài viết
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
