/**
 * Maps ReferenceData `province.regionCode` (compact codes used in upload form) to display names for “vùng / miền”.
 * Keep in sync with contributor flow expectations.
 */
export const PROVINCE_REGION_CODE_TO_NAME: Record<string, string> = {
  TN: 'Tây Nguyên',
  DNB: 'Đông Nam Bộ',
  DBSCL: 'Đồng bằng sông Cửu Long',
  TB: 'Tây Bắc',
  DBSH: 'Đồng bằng sông Hồng',
  ĐB: 'Đông Bắc',
  BTB: 'Bắc Trung Bộ',
  NTB: 'Nam Trung Bộ',
};

/** Human label for upload/reference `regionCode`; empty string if missing (matches legacy `getRegionName`). */
export function macroRegionDisplayNameFromProvinceRegionCode(
  code: string | undefined | null,
): string {
  if (code == null || !String(code).trim()) return '';
  const c = String(code).trim();
  return PROVINCE_REGION_CODE_TO_NAME[c] ?? c;
}
