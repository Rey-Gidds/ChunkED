'use client';

import { useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { WebRTCManager } from '@/lib/webrtc';
import { sendFile, handleIncomingMessage } from '@/lib/transfer';

export const useTransferLogic = () => {
  const store = useAppStore;
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const offerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
    wsRef.current?.close();
    webrtcRef.current?.close();
    wsRef.current = null;
    webrtcRef.current = null;
  };

  const initWebSocket = (sid: string): WebSocket => {
    if (wsRef.current) wsRef.current.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // During local dev, Next.js runs on 3000, backend on 7734
    const host = window.location.port === '3000' ? `${window.location.hostname}:7734` : window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/signal/${sid}`);
    wsRef.current = ws;
    return ws;
  };

  const startSendSession = async () => {
    const sid = Math.random().toString(36).substring(2, 10);
    const s = store.getState();
    s.setSid(sid);
    s.setConnectionState('Waiting for peer...');

    const webrtc = new WebRTCManager();
    webrtcRef.current = webrtc;

    const ws = initWebSocket(sid);

    webrtc.onIceCandidate((candidate: RTCIceCandidate) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'candidate', candidate }));
      }
    });

    const offer = await webrtc.createOffer();
    const joinUrl = `${window.location.origin}/?sid=${sid}`;
    store.getState().setOfferPayload(joinUrl);

    // Signaling handler
    ws.onmessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'answer') {
          await webrtc.applyAnswer(msg);
          if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
        } else if (msg.type === 'candidate') {
          await webrtc.addIceCandidate(msg.candidate);
        }
      } catch (err) {
        console.error('[Signal] Parse error:', err);
      }
    };

    webrtc.onOpen(() => {
      store.getState().setConnectionState('Connected');
      if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
      processQueue();
    });

    webrtc.onClose(() => {
      store.getState().setConnectionState('Disconnected');
    });

    // Periodically send offer until connected
    offerIntervalRef.current = setInterval(() => {
      if (store.getState().connectionState === 'Connected') {
        if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
        return;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(offer));
      }
    }, 2000);
  };

  const startJoinSession = async (sid: string) => {
    const s = store.getState();
    s.setSid(sid);
    s.setConnectionState('Connecting');

    const webrtc = new WebRTCManager();
    webrtcRef.current = webrtc;

    const ws = initWebSocket(sid);

    webrtc.onIceCandidate((candidate: RTCIceCandidate) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'candidate', candidate }));
      }
    });

    ws.onmessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        const state = store.getState().connectionState;
        if (msg.type === 'offer' && (state === 'Connecting' || state === 'Waiting for peer...')) {
          const answer = await webrtc.createAnswer(msg);
          ws.send(JSON.stringify(answer));
        } else if (msg.type === 'candidate') {
          await webrtc.addIceCandidate(msg.candidate);
        }
      } catch (err) {
        console.error('[Signal] Parse error:', err);
      }
    };

    webrtc.onOpen(() => {
      store.getState().setConnectionState('Connected');
    });

    webrtc.onClose(() => {
      store.getState().setConnectionState('Disconnected');
    });

    webrtc.onMessage((data: any) => {
      handleIncomingMessage(data, {
        onReady: (meta: any) => {
          store.getState().setIncomingFile({ ...meta, progress: 0 });
        },
        onProgress: (loaded: number, total: number) => {
          const current = store.getState().incomingFile;
          if (current) {
            store.getState().setIncomingFile({ ...current, progress: (loaded / total) * 100 });
          }
        },
        onComplete: (result: { name: string; url: string }) => {
          const current = store.getState().incomingFile;
          store.getState().addReceivedFile({
            id: Math.random().toString(36).substring(7),
            name: result.name,
            size: current?.size || 0,
            progress: 100,
            status: 'complete',
            url: result.url,
          });
        },
        onError: (err: any) => console.error('[Transfer]', err),
      });
    });
  };

  const processQueue = async () => {
    const state = store.getState();
    if (state.isTransferring || state.connectionState !== 'Connected') return;

    const next = state.transferQueue.find(i => i.status === 'queued');
    if (!next || !next.file) return;

    state.setIsTransferring(true);
    state.updateQueueItem(next.id, { status: 'sending' });

    try {
      await sendFile(
        {
          send: (d: any) => webrtcRef.current?.sendRaw(d),
          get bufferedAmount() { return webrtcRef.current?.getBufferedAmount() || 0; },
        },
        next.file,
        (sent, total) => {
          store.getState().updateQueueItem(next.id, { progress: (sent / total) * 100 });
        }
      );
      store.getState().updateQueueItem(next.id, { status: 'complete', progress: 100 });
    } catch {
      store.getState().updateQueueItem(next.id, { status: 'error' });
    }

    store.getState().setIsTransferring(false);
    // Process next item after a short delay
    setTimeout(processQueue, 300);
  };

  return { startSendSession, startJoinSession, cleanup, processQueue };
};
