import { useCallback, useEffect, useState } from 'react';

import { fetchUserConversations, type QAConversationRequest } from '@/services/qaConversationService';

export function useChatbotSession(userId: string | undefined) {
  const [history, setHistory] = useState<QAConversationRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const data = await fetchUserConversations(userId);
      setHistory(
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    } catch (err) {
      console.error(err);
      setHistory([]);
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
