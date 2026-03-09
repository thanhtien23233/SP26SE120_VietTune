import { api } from "@/services/api";

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
export async function getAddressFromCoordinates(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResponse> {
  try {
    const data = await api.get<ReverseGeocodeResponse>("Geocode/reverse", {
      params: { lat, lon },
    });
    return data ?? {};
  } catch (err) {
    console.warn("Geocode reverse error:", err);
    const gpsText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    return {
      address: `Tọa độ: ${gpsText}`,
      coordinates: gpsText,
      addressFromService: false,
      message: (err as Error)?.message ?? "Không kết nối được dịch vụ địa chỉ.",
    };
  }
}
