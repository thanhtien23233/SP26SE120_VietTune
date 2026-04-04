import axios from "axios";
import { API_BASE_URL } from "@/config/constants";
import { getItem } from "@/services/storageService";

export interface QAConversationRequest {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

const getHeaders = () => {
  const token = getItem("access_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const createQAConversation = async (data: QAConversationRequest): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/QAConversation`, data, {
      headers: getHeaders(),
    });
  } catch (err) {
    console.error("Lỗi khi tạo conversation:", err);
    throw err;
  }
};

export const fetchUserConversations = async (userId: string): Promise<QAConversationRequest[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/QAConversation/get-by-user`, {
      params: { userId },
      headers: getHeaders(),
    });
    return res.data?.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy lịch sử hội thoại:", err);
    return [];
  }
};
