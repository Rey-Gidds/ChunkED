import { create } from 'zustand';

export type TransferItem = {
  id: string;
  file?: File;
  name: string;
  size: number;
  progress: number;
  status: 'queued' | 'sending' | 'complete' | 'error';
  url?: string; // For received files
};

type AppState = {
  mode: 'idle' | 'send' | 'receive';
  connectionState: 'Disconnected' | 'Connecting' | 'Connected' | 'Error' | 'Waiting for peer...';
  sid: string | null;
  offerPayload: string | null;
  transferQueue: TransferItem[];
  receivedFiles: TransferItem[];
  isTransferring: boolean;
  
  // Received file metadata (current transfer)
  incomingFile: {
    name: string;
    size: number;
    progress: number;
  } | null;

  setMode: (mode: 'idle' | 'send' | 'receive') => void;
  setConnectionState: (state: AppState['connectionState']) => void;
  setSid: (sid: string | null) => void;
  setOfferPayload: (payload: string | null) => void;
  addToQueue: (items: TransferItem[]) => void;
  updateQueueItem: (id: string, updates: Partial<TransferItem>) => void;
  addReceivedFile: (file: TransferItem) => void;
  setIncomingFile: (file: AppState['incomingFile']) => void;
  setIsTransferring: (is: boolean) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set: any) => ({
  mode: 'idle',
  connectionState: 'Disconnected',
  sid: null,
  offerPayload: null,
  transferQueue: [],
  receivedFiles: [],
  isTransferring: false,
  incomingFile: null,

  setMode: (mode: 'idle' | 'send' | 'receive') => set({ mode }),
  setConnectionState: (connectionState: AppState['connectionState']) => set({ connectionState }),
  setSid: (sid: string | null) => set({ sid }),
  setOfferPayload: (offerPayload: string | null) => set({ offerPayload }),
  addToQueue: (items: TransferItem[]) => set((state: AppState) => ({ transferQueue: [...state.transferQueue, ...items] })),
  updateQueueItem: (id: string, updates: Partial<TransferItem>) => set((state: AppState) => ({
    transferQueue: state.transferQueue.map((item) => item.id === id ? { ...item, ...updates } : item)
  })),
  addReceivedFile: (file: TransferItem) => set((state: AppState) => ({ 
    receivedFiles: [file, ...state.receivedFiles],
    incomingFile: null 
  })),
  setIncomingFile: (incomingFile: AppState['incomingFile']) => set({ incomingFile }),
  setIsTransferring: (isTransferring: boolean) => set({ isTransferring }),
  reset: () => set({
    mode: 'idle',
    connectionState: 'Disconnected',
    sid: null,
    offerPayload: null,
    transferQueue: [],
    receivedFiles: [],
    isTransferring: false,
    incomingFile: null,
  }),
}));
