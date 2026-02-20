import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  payload?: Record<string, unknown>;
}

const WS_BASE_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/notifications/ws`;
const MAX_RECONNECT_DELAY = 30_000;

export function useWebSocket(userId: string | undefined) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), MAX_RECONNECT_DELAY);
    return delay;
  }, []);

  const invalidateByMessageType = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'notification':
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
          break;
        case 'task_updated':
        case 'task_created':
        case 'task_deleted':
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['task'] });
          break;
        case 'comment_added':
          queryClient.invalidateQueries({ queryKey: ['comments'] });
          break;
        case 'project_updated':
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['project'] });
          break;
        case 'wiki_updated':
          queryClient.invalidateQueries({ queryKey: ['wiki'] });
          queryClient.invalidateQueries({ queryKey: ['wikiPage'] });
          break;
        case 'attachment_added':
        case 'attachment_deleted':
          queryClient.invalidateQueries({ queryKey: ['attachments'] });
          break;
        default:
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          break;
      }
    },
    [queryClient],
  );

  const connect = useCallback(() => {
    if (!userId) return;

    const ws = new WebSocket(`${WS_BASE_URL}?userId=${encodeURIComponent(userId)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        invalidateByMessageType(message);
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      const delay = getReconnectDelay();
      reconnectAttemptRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [userId, invalidateByMessageType, getReconnectDelay]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, lastMessage };
}
