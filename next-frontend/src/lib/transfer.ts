export type FileMeta = {
  name: string;
  size: number;
  type: string;
};

export const sendFile = async (
  channel: { send: (d: any) => void; bufferedAmount: number },
  file: File,
  onProgress: (sent: number, total: number) => void
) => {
  const CHUNK_SIZE = 16384; // 16KB
  const meta: FileMeta = { name: file.name, size: file.size, type: file.type };
  
  // Send metadata first
  channel.send(JSON.stringify({ type: 'meta', ...meta }));

  const reader = file.stream().getReader();
  let sent = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    let offset = 0;
    while (offset < value.length) {
      // Flow control: wait if buffer is full (> 1MB)
      if (channel.bufferedAmount > 1024 * 1024) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      const end = Math.min(offset + CHUNK_SIZE, value.length);
      const chunk = value.slice(offset, end);
      channel.send(chunk);
      
      offset = end;
      sent += chunk.length;
      onProgress(sent, file.size);
    }
  }

  channel.send(JSON.stringify({ type: 'complete' }));
};

type IncomingHandlers = {
  onReady: (meta: FileMeta) => void;
  onProgress: (loaded: number, total: number) => void;
  onComplete: (result: { name: string; url: string }) => void;
  onError: (err: any) => void;
};

let incomingBuffer: Uint8Array[] = [];
let incomingMeta: FileMeta | null = null;
let receivedSize = 0;

export const handleIncomingMessage = (data: any, handlers: IncomingHandlers) => {
  if (typeof data === 'string') {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'meta') {
        incomingMeta = { name: msg.name, size: msg.size, type: msg.type };
        incomingBuffer = [];
        receivedSize = 0;
        handlers.onReady(incomingMeta);
      } else if (msg.type === 'complete' && incomingMeta) {
        const blob = new Blob(incomingBuffer, { type: incomingMeta.type });
        const url = URL.createObjectURL(blob);
        handlers.onComplete({ name: incomingMeta.name, url });
        incomingMeta = null;
        incomingBuffer = [];
      }
    } catch (e) {
      console.error('[Transfer] Parse error:', e);
    }
  } else {
    // Binary chunk
    if (!incomingMeta) return;
    
    incomingBuffer.push(new Uint8Array(data));
    receivedSize += data.byteLength;
    handlers.onProgress(receivedSize, incomingMeta.size);
  }
};
