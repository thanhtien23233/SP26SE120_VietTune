import { describe, expect, it } from 'vitest';

import { getYouTubeId, isYouTubeUrl } from './youtube';

describe('youtube utils', () => {
  it('detects youtube urls', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://example.com/video.mp4')).toBe(false);
  });

  it('extracts video id from supported formats', () => {
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('invalid-url')).toBeNull();
  });
});
