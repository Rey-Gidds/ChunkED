'use client';

import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface TransferCardProps {
  name: string;
  size: number;
  progress: number;
  isSending?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export const TransferCard = ({ name, size, progress, isSending = false }: TransferCardProps) => {
  const pct = Math.round(progress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42,
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isSending ? 'var(--primary-glow)' : 'var(--success-glow)',
          color: isSending ? 'var(--primary)' : 'var(--success)',
          flexShrink: 0,
        }}>
          {isSending ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
            {formatSize(size)}
          </div>
        </div>

        <div style={{
          fontWeight: 800, fontSize: 18,
          color: isSending ? 'var(--primary)' : 'var(--success)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {pct}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <motion.div
          className={`progress-fill ${isSending ? 'sending' : 'receiving'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </motion.div>
  );
};
