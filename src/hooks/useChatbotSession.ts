import { useCallback, useEffect, useState } from 'react';

import { chatSessionStorage } from '@/services/chatSessionStorage';
import { fetchUserConversations, type QAConversationRequest } from '@/services/qaConversationService';

export function useChatbotSession(userId: string | undefined) {
  const [history, setHistory] = useState<QAConversationRequest[]>(() =>
    chatSessionStorage.loadConversationList(),
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const data = await fetchUserConversations(userId);
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setHistory(sorted);
      chatSessionStorage.saveConversationList(sorted);
    } catch (err) {
      console.error(err);
      // Keep cached data on error — don't clear
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadHistory();
    }
  }, [loadHistory, userId]);

  return { history, isLoadingHistory, loadHistory };
}
