import { legacyApi } from '@/api/legacyHttp';
import type { ServiceApiClient } from '@/services/serviceApiClient';
import { logServiceWarn } from '@/services/serviceLogger';

export type ReverseGeocodeResponse = {
  address?: string;
  coordinates?: string;
  /** True khi backend lấy được địa chỉ từ dịch vụ bản đồ (Nominatim). */
  addressFromService?: boolean;
  message?: string;
};

/**
 * Reverse geocode: chuyển tọa độ (lat, lon) thành địa chỉ dạng chữ qua backend (Nominatim).
 * Backend luôn trả 200; khi không lấy được địa chỉ thì address = "Tọa độ: lat, lon" và addressFromService = false.
 */
export function createGeocodeService(client: ServiceApiClient) {
  return {
    getAddressFromCoordinates: async (
      lat: number,
      lon: number,
    ): Promise<ReverseGeocodeResponse> => {
      try {
        const data = await client.get<ReverseGeocodeResponse>('Geocode/reverse', {
          params: { lat, lon },
        });
        return data ?? {};
      } catch (err) {
        logServiceWarn('Geocode reverse error', err);
        const gpsText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        return {
          address: `Tọa độ: ${gpsText}`,
          coordinates: gpsText,
          addressFromService: false,
          message: (err as Error)?.message ?? 'Không kết nối được dịch vụ địa chỉ.',
        };
      }
    },
  };
}

const geocodeService = createGeocodeService(legacyApi);
export const getAddressFromCoordinates = geocodeService.getAddressFromCoordinates;
