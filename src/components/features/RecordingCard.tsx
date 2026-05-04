import { Play, Heart, Download, Eye } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import Badge from '../common/Badge';

import logo from '@/components/image/VietTune logo.png';
import { RECORDING_TYPE_NAMES } from '@/config/constants';
import { Recording } from '@/types';

interface RecordingCardProps {
  recording: Recording;
  /** Optional state to pass when navigating to detail (e.g. { from: "/search?q=..." } to restore filters on back) */
  linkState?: Record<string, unknown>;
}

function RecordingCard({ recording, linkState }: RecordingCardProps) {
  if (!recording.id) {
    return null;
  }

  return (
    <Link to={`/recordings/${recording.id}`} state={linkState} className="block cursor-pointer">
      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 bg-surface-panel"
      >
        {/* Cover Image */}
        <div className="relative h-48 bg-neutral-100">
          {recording.coverImage ? (
            <img
              src={recording.coverImage}
              alt={recording.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width={640}
              height={480}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400">
              <div className="text-center">
                <img
                  src={logo}
                  alt="VietTune Logo"
                  className="w-24 h-24 mb-2 mx-auto object-contain opacity-40"
                  loading="lazy"
                  decoding="async"
                  width={96}
                  height={96}
                />
                <p className="text-sm">Chưa có ảnh bìa</p>
              </div>
            </div>
          )}

          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center group cursor-pointer">
            <div className="bg-white rounded-full p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110">
              <Play className="h-8 w-8 text-primary-600" strokeWidth={2.5} />
            </div>
          </div>

          {/* Verification badge */}
          {recording.verificationStatus === 'VERIFIED' && (
            <div className="absolute top-2 right-2">
              <Badge variant="success" size="sm">
                Đã xác minh
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-semibold text-neutral-900 text-lg mb-1 line-clamp-1">
            {recording.title}
          </h3>
          {recording.titleVietnamese && (
            <p className="text-sm text-neutral-600 font-medium mb-3 line-clamp-1">
              {recording.titleVietnamese}
            </p>
          )}

          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary-100/90 text-primary-800 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
              {recording.ethnicity?.nameVietnamese ?? 'Không xác định'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-secondary-100/90 text-secondary-800 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
              {recording.recordingType != null &&
              RECORDING_TYPE_NAMES[recording.recordingType] != null
                ? RECORDING_TYPE_NAMES[recording.recordingType]
                : 'Khác'}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" strokeWidth={2.5} />
                {recording.viewCount ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" strokeWidth={2.5} />
                {recording.likeCount ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
                {recording.downloadCount ?? 0}
              </span>
            </div>
            <span className="tabular-nums">
              {Math.floor((recording.duration ?? 0) / 60)
                .toString()
                .padStart(2, '0')}
              :{((recording.duration ?? 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const MemoizedRecordingCard = memo(RecordingCard);
MemoizedRecordingCard.displayName = 'RecordingCard';

export default MemoizedRecordingCard;
