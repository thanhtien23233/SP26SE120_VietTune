// YouTube URL helpers for AudioPlayer
export function isYouTubeUrl(url?: string): boolean {
  if (!url) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
}

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  // Match various YouTube URL formats
  const regex =
    /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
