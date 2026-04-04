import axios from "axios";
import { API_BASE_URL } from "@/config/constants";
import { getItem } from "@/services/storageService";

export interface QAMessageRequest {
  id: string;
  conversationId: string;
  role: number;
  content: string;
  sourceRecordingIdsJson?: string | null;
  sourceKBEntryIdsJson?: string | null;
  confidenceScore?: number;
  flaggedByExpert?: boolean;
  correctedByExpertId?: string | null;
  expertCorrection?: string | null;
  createdAt: string;
}

const getHeaders = () => {
  const token = getItem("access_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const createQAMessage = async (data: QAMessageRequest): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/QAMessage`, data, {
      headers: getHeaders(),
    });
  } catch (err) {
    console.error("Lỗi khi lưu tin nhắn:", err);
    throw err;
  }
};

export const fetchConversationMessages = async (conversationId: string): Promise<QAMessageRequest[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/QAMessage/get-by-conversation`, {
      params: { conversationId },
      headers: getHeaders(),
    });
    return res.data?.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy tin nhắn hội thoại:", err);
    return [];
  }
};

export const flagMessage = async (messageId: string): Promise<void> => {
  try {
    await axios.put(`${API_BASE_URL}/QAMessage/flagged`, { id: messageId }, {
      headers: getHeaders(),
    });
  } catch (err) {
    console.error("Lỗi khi flag tin nhắn:", err);
    throw err;
  }
};

export const unflagMessage = async (messageId: string): Promise<void> => {
  try {
    await axios.put(`${API_BASE_URL}/QAMessage/unflagged`, { id: messageId }, {
      headers: getHeaders(),
    });
  } catch (err) {
    console.error("Lỗi khi unflag tin nhắn:", err);
    throw err;
  }
};
