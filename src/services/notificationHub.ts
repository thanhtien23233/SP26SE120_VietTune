import {
  type HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { API_BASE_URL } from '@/config/constants';
import { authService } from '@/services/authService';
import { mapNotificationFromApiRecord } from '@/services/recordingRequestService';
import { getItem } from '@/services/storageService';
import type { AppNotification } from '@/types';

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();

let connection: HubConnection | null = null;
let startingPromise: Promise<void> | null = null;
let connectionStateHandler: ((connected: boolean) => void) | null = null;
let hubPermanentlyUnavailable = false;

export function getNotificationHubUrl(): string {
  const explicit = import.meta.env.VITE_SIGNALR_HUB_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const base = API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '');
  return `${base}/notificationHub`;
}

function isPermanentError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    msg.includes('404') ||
    msg.toLowerCase().includes('not found') ||
    msg.includes('403') ||
    msg.toLowerCase().includes('forbidden')
  );
}

export function setNotificationHubConnectionHandler(
  handler: ((connected: boolean) => void) | null,
): void {
  connectionStateHandler = handler;
}

function notifyConnectionState(connected: boolean): void {
  connectionStateHandler?.(connected);
}

function emitToListeners(notification: AppNotification): void {
  listeners.forEach((fn) => {
    try {
      fn(notification);
    } catch {
      /* ignore */
    }
  });
}

function onReceivePayload(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return;
  const rec = payload as Record<string, unknown>;
  try {
    const n = mapNotificationFromApiRecord(rec);
    emitToListeners(n);
  } catch {
    /* ignore malformed */
  }
}

async function startConnection(): Promise<void> {
  if (hubPermanentlyUnavailable) return;

  if (!authService.isAuthenticated()) {
    notifyConnectionState(false);
    return;
  }

  if (connection?.state === HubConnectionState.Connected) {
    notifyConnectionState(true);
    return;
  }

  if (startingPromise) {
    await startingPromise;
    return;
  }

  if (connection) {
    try {
      await connection.start();
      notifyConnectionState(true);
    } catch (err) {
      notifyConnectionState(false);
      if (isPermanentError(err)) hubPermanentlyUnavailable = true;
      connection = null;
    }
    return;
  }

  startingPromise = (async () => {
    const conn = new HubConnectionBuilder()
      .withUrl(getNotificationHubUrl(), {
        accessTokenFactory: () => getItem('access_token') ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();

    conn.on('ReceiveNotification', onReceivePayload);

    conn.onreconnecting(() => {
      notifyConnectionState(false);
    });

    conn.onreconnected(() => {
      notifyConnectionState(true);
    });

    conn.onclose(() => {
      notifyConnectionState(false);
    });

    connection = conn;

    try {
      await conn.start();
      notifyConnectionState(true);
    } catch (err) {
      notifyConnectionState(false);
      if (isPermanentError(err)) hubPermanentlyUnavailable = true;
      connection = null;
    } finally {
      startingPromise = null;
    }
  })();

  await startingPromise;
}

async function stopConnection(): Promise<void> {
  startingPromise = null;
  const conn = connection;
  connection = null;
  notifyConnectionState(false);
  if (!conn) return;
  try {
    await conn.stop();
  } catch {
    /* ignore */
  }
}

export function subscribeNotificationHub(listener: Listener): () => void {
  listeners.add(listener);
  void startConnection();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      void stopConnection();
    }
  };
}
