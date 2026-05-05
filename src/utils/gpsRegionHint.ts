/**
 * Coarse region hint from lat/lng for Vietnam-centric contributor metadata (AI prompt context).
 * Not a substitute for reverse geocoding; used only to enrich MetadataSuggest description.
 */
export function buildGpsRegionHintForMetadata(lat: number, lng: number): string | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const inVietnam = lat >= 7.5 && lat <= 24.0 && lng >= 102.0 && lng <= 110.5;
  if (!inVietnam) {
    return `Bối cảnh GPS: tọa độ ${lat.toFixed(5)}, ${lng.toFixed(5)} (có thể ngoài lãnh thổ Việt Nam).`;
  }
  let band: string;
  if (lat >= 17.4) band = 'Miền Bắc hoặc Bắc Trung Bộ';
  else if (lat >= 12.8) band = 'Bắc Trung Bộ, Dải duyên hải Trung Bộ hoặc Tây Nguyên';
  else if (lat >= 10.8) band = 'Nam Trung Bộ hoặc Đông Nam Bộ';
  else band = 'Miền Nam hoặc Tây Nam Bộ';
  return `Gợi ý vùng từ GPS (ước lượng thô): ${band}. Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}.`;
}
