import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function useWebSocket(
  channel: string,
  onEvent: (data: unknown) => void,
  eventName = 'trade'
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(WS_URL, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('subscribe', { channel });
    });

    socketRef.current.on(eventName, onEvent);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [channel, eventName]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}