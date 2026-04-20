'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTransferLogic } from '@/hooks/useTransferLogic';
import { FileStack } from '@/components/FileStack';
import { TransferCard } from '@/components/TransferCard';
import { QRScanner } from '@/components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Download, Plus, Scan, Files, ArrowLeft,
  Check, Wifi, WifiOff, Loader2, X
} from 'lucide-react';

/* ─── Styles object ─── */
const S = {
  page: {
    minHeight: '100vh' as string,
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px 16px env(safe-area-inset-bottom, 16px)',
  } as React.CSSProperties,
  nav: {
    width: '100%', maxWidth: 540,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, padding: '8px 0',
  } as React.CSSProperties,
  logo: {
    fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em',
    color: 'var(--primary)',
  } as React.CSSProperties,
  content: {
    width: '100%', maxWidth: 540,
    flex: 1, display: 'flex', flexDirection: 'column' as const,
    gap: 16,
  } as React.CSSProperties,
  card: {
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: 28, boxShadow: 'var(--shadow-md)',
  } as React.CSSProperties,
  modeBtn: {
    flex: 1, display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: 16, padding: '32px 24px',
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    cursor: 'pointer', transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,
  iconCircle: (bg: string, color: string) => ({
    width: 64, height: 64, borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color,
    transition: 'transform 0.2s ease',
  } as React.CSSProperties),
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--fg-muted)', fontSize: 14, fontWeight: 500,
    padding: '4px 0',
  } as React.CSSProperties,
  qrWrapper: {
    padding: 16, background: '#ffffff', borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  } as React.CSSProperties,
  emptyState: {
    padding: '36px 20px', textAlign: 'center' as const,
    border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
    color: 'var(--fg-muted)',
  } as React.CSSProperties,
  footer: {
    marginTop: 'auto', padding: '24px 0 8px',
    fontSize: 12, color: 'var(--fg-muted)', opacity: 0.5,
    textAlign: 'center' as const,
  } as React.CSSProperties,
};

/* ─── Animation variants ─── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function Home() {
  const store = useAppStore();
  const { startSendSession, startJoinSession, cleanup, processQueue } = useTransferLogic();
  const [showScanner, setShowScanner] = useState(false);

  // Auto-join if URL has ?sid= 
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    if (sid) {
      store.setMode('receive');
      startJoinSession(sid);
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'queued' as const,
    }));
    store.addToQueue(files);
    if (store.connectionState === 'Connected') processQueue();
  };

  const handleBack = () => {
    cleanup();
    setShowScanner(false);
    store.reset();
  };

  const currentSending = store.transferQueue.find(i => i.status === 'sending');
  const completedItems = store.transferQueue.filter(f => f.status === 'complete');
  const queuedItems = store.transferQueue.filter(f => f.status === 'queued');
  const errorItems = store.transferQueue.filter(f => f.status === 'error');
  const isConnected = store.connectionState === 'Connected';

  return (
    <div style={S.page}>
      {/* ─── NAV ─── */}
      <nav style={S.nav}>
        {store.mode !== 'idle' ? (
          <button onClick={handleBack} style={S.backBtn}>
            <ArrowLeft size={18} /> Back
          </button>
        ) : (
          <div style={S.logo}>ChunkED</div>
        )}

        <div className={`status-pill ${isConnected ? 'connected' : ''}`}>
          <span className="dot" />
          {store.connectionState === 'Disconnected' ? 'Idle' : store.connectionState}
        </div>
      </nav>

      {/* ─── CONTENT ─── */}
      <div style={S.content}>
        <AnimatePresence mode="wait">

          {/* ════════ IDLE ════════ */}
          {store.mode === 'idle' && (
            <motion.div key="idle" {...pageVariants}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Hero */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
                  Share files, <span style={{ color: 'var(--primary)' }}>instantly</span>
                </h1>
                <p style={{ fontSize: 15, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  Peer-to-peer transfer via WebRTC. No uploads, no cloud, no limits.
                </p>
              </div>

              {/* Mode buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  style={S.modeBtn}
                  onClick={() => { store.setMode('send'); startSendSession(); }}
                  onMouseEnter={e => { (e.currentTarget.querySelector('.icon') as HTMLElement)?.style.setProperty('transform','scale(1.1)'); }}
                  onMouseLeave={e => { (e.currentTarget.querySelector('.icon') as HTMLElement)?.style.setProperty('transform','scale(1)'); }}
                >
                  <div className="icon" style={S.iconCircle('var(--primary)', '#fff')}>
                    <Send size={28} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'white' }}>Send</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Show QR code</div>
                  </div>
                </button>

                <button
                  style={S.modeBtn}
                  onClick={() => store.setMode('receive')}
                  onMouseEnter={e => { (e.currentTarget.querySelector('.icon') as HTMLElement)?.style.setProperty('transform','scale(1.1)'); }}
                  onMouseLeave={e => { (e.currentTarget.querySelector('.icon') as HTMLElement)?.style.setProperty('transform','scale(1)'); }}
                >
                  <div className="icon" style={S.iconCircle('var(--bg-card-solid)', 'var(--primary)')}>
                    <Download size={28} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'white' }}>Receive</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Scan QR code</div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ SEND ════════ */}
          {store.mode === 'send' && (
            <motion.div key="send" {...pageVariants}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* QR Section */}
              <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Ready to Send</h2>
                  <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
                    Scan this QR from the receiving device
                  </p>
                </div>

                <div style={S.qrWrapper}>
                  {store.offerPayload ? (
                    <QRCodeSVG value={store.offerPayload} size={200} level="H"/>
                  ) : (
                    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 size={32} style={{ color: 'var(--fg-muted)', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>

                {isConnected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: 'var(--success)', fontWeight: 600, fontSize: 14,
                    }}
                  >
                    <Wifi size={16} /> Peer connected
                  </motion.div>
                )}
              </div>

              {/* Queue section */}
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    Queue {store.transferQueue.length > 0 && <span style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>· {store.transferQueue.length}</span>}
                  </div>
                  <label className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    <Plus size={15} /> Add
                    <input type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {store.transferQueue.length === 0 && (
                    <div style={S.emptyState}>
                      <Files size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div style={{ fontSize: 14, fontWeight: 500 }}>No files yet</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Tap "Add" to pick files</div>
                    </div>
                  )}

                  {currentSending && (
                    <TransferCard
                      name={currentSending.name}
                      size={currentSending.size}
                      progress={currentSending.progress}
                      isSending
                    />
                  )}

                  {queuedItems.map(f => (
                    <div key={f.id} style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontSize: 14,
                    }}>
                      <Files size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)', flexShrink: 0 }}>Queued</span>
                      <button
                        onClick={() => store.removeFromQueue(f.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 4, marginLeft: 4, borderRadius: '50%'
                        }}
                        title="Remove from queue"
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {completedItems.map(f => (
                    <div key={f.id} style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', opacity: 0.6,
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontSize: 14,
                    }}>
                      <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--success)', flexShrink: 0 }}>Sent</span>
                    </div>
                  ))}

                  {errorItems.map(f => (
                    <div key={f.id} style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', opacity: 0.8,
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontSize: 14, background: 'rgba(239, 68, 68, 0.05)'
                    }}>
                      <WifiOff size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: '#ef4444', flexShrink: 0 }}>Failed</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════ RECEIVE ════════ */}
          {store.mode === 'receive' && (
            <motion.div key="receive" {...pageVariants}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Pre-scan: show scan button */}
              {!store.sid && !showScanner && (
                <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 40 }}>
                  <div style={S.iconCircle('var(--primary-glow)', 'var(--primary)')}>
                    <Scan size={32} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Receive Files</h2>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                      Point your camera at the sender&apos;s QR code
                    </p>
                  </div>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px 24px', fontSize: 16, borderRadius: 'var(--radius-md)' }}
                  >
                    <Scan size={18} /> Open Scanner
                  </button>
                </div>
              )}

              {/* Scanner active */}
              {showScanner && !store.sid && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Align QR Code</div>
                    <button onClick={() => setShowScanner(false)} style={{ ...S.backBtn, fontSize: 13 }}>Cancel</button>
                  </div>
                  <QRScanner
                    onScan={(url) => {
                      try {
                        const sid = new URL(url).searchParams.get('sid');
                        if (sid) {
                          startJoinSession(sid);
                          setShowScanner(false);
                        }
                      } catch { /* invalid URL */ }
                    }}
                    active={showScanner}
                  />
                </motion.div>
              )}

              {/* Connected status */}
              {store.sid && isConnected && !store.incomingFile && store.receivedFiles.length === 0 && (
                <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={S.iconCircle('var(--success-glow)', 'var(--success)')}
                  >
                    <Wifi size={32} />
                  </motion.div>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Connected</h3>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Waiting for the sender to pick files…</p>
                  </div>
                </div>
              )}

              {/* Connecting state */}
              {store.sid && !isConnected && (
                <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
                  <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Connecting…</h3>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Establishing peer-to-peer link</p>
                  </div>
                </div>
              )}

              {/* Incoming transfer card */}
              {store.incomingFile && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)', marginBottom: 10, paddingLeft: 4 }}>
                    Incoming
                  </div>
                  <TransferCard
                    name={store.incomingFile.name}
                    size={store.incomingFile.size}
                    progress={store.incomingFile.progress}
                  />
                </div>
              )}

              {/* Received files stack */}
              <FileStack files={store.receivedFiles} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── FOOTER ─── */}
      <div style={S.footer}>
        Private · P2P · No server storage
      </div>

      {/* Spin keyframe (inline for the loader) */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
