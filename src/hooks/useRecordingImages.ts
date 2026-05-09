import { useEffect, useState } from 'react';

import {
  recordingImageService,
  type RecordingImage,
} from '@/services/recordingImageService';

type UseRecordingImagesResult = {
  images: RecordingImage[];
  loading: boolean;
  error: string | null;
};

export function useRecordingImages(recordingId?: string): UseRecordingImagesResult {
  const [images, setImages] = useState<RecordingImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId) {
      setImages([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const list = await recordingImageService.getByRecording(recordingId);
        if (cancelled) return;
        setImages(Array.isArray(list) ? list : []);
      } catch {
        if (cancelled) return;
        setImages([]);
        setError('Không thể tải hình ảnh bản thu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recordingId]);

  return { images, loading, error };
}

