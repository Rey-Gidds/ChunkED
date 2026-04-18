'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import type { TransferItem } from '@/store/useAppStore';

interface FileStackProps {
  files: TransferItem[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const FileStack = ({ files }: FileStackProps) => {
  if (files.length === 0) return null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const,
        letterSpacing: '0.06em', color: 'var(--fg-muted)',
        marginBottom: 12, paddingLeft: 4,
      }}>
        Received · {files.length} file{files.length !== 1 ? 's' : ''}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence initial={false}>
          {files.map((file) => (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 100 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-glow)',
                color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={18} />
              </div>

              {/* Name + size */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{file.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{formatSize(file.size)}</span>
                </div>
              </div>

              {/* Download */}
              {file.url && (
                <motion.a
                  whileTap={{ scale: 0.9 }}
                  href={file.url}
                  download={file.name}
                  style={{
                    width: 38, height: 38,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px var(--primary-glow)',
                  }}
                >
                  <Download size={16} />
                </motion.a>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
