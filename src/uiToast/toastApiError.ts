import { getNormalizedApiError, notifyLine, uiToast } from '@/uiToast';
import { getErrorMessage } from '@/utils/httpError';

export function toastApiError(error: unknown, fallbackMessage: string, title = 'Lỗi'): void {
  const normalized = getNormalizedApiError(error);
  const message = normalized?.rawMessage ?? getErrorMessage(error, fallbackMessage);
  uiToast.error(notifyLine(title, message));
}

