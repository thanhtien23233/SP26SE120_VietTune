import { Music } from 'lucide-react';

import AudioPlayer from '@/components/features/AudioPlayer';
import VideoPlayer from '@/components/features/VideoPlayer';

type UploadMediaPreviewProps = {
  show: boolean;
  mediaType: 'audio' | 'video';
  src: string | null;
  mediaName: string;
  title: string;
  artist: string;
};

export default function UploadMediaPreview({
  show,
  mediaType,
  src,
  mediaName,
  title,
  artist,
}: UploadMediaPreviewProps) {
  if (!show || !src) return null;

  return (
    <div
      className="mb-6 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/85 to-secondary-50/45 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary-100 p-2">
          <Music className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-800">Bản thu đã tải lên</h3>
          <p className="text-sm text-neutral-500">Xem trước tệp tin vừa tải lên máy chủ</p>
        </div>
      </div>

      {mediaType === 'video' ? (
        <VideoPlayer src={src} title={mediaName || title || 'File video'} artist={artist} showContainer={true} />
      ) : (
        <AudioPlayer src={src} title={mediaName || title || 'File âm thanh'} artist={artist} />
      )}
    </div>
  );
}
