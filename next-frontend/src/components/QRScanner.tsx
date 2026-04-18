'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, Scan } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export const QRScanner = ({ onScan, active }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let stream: MediaStream | null = null;
    let animationId: number;
    let stopped = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (videoRef.current && !stopped) {
          videoRef.current.srcObject = stream;
          setScanning(true);
        }
      } catch {
        setError('Could not access camera. Please allow camera permissions.');
      }
    };

    const scan = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data.includes('?sid=')) {
            stopped = true;
            setScanning(false);
            if (stream) stream.getTracks().forEach(t => t.stop());
            onScanRef.current(code.data);
            return;
          }
        }
      }
      animationId = requestAnimationFrame(scan);
    };

    startCamera().then(() => {
      if (!stopped) animationId = requestAnimationFrame(scan);
    });

    return () => {
      stopped = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animationId);
    };
  }, [active]);

  if (error) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        textAlign: 'center',
      }}>
        <Camera size={40} style={{ color: 'var(--danger)' }} />
        <p style={{ fontWeight: 600 }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-ghost" style={{ gap: 8 }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 360,
      aspectRatio: '1',
      margin: '0 auto',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '2px solid var(--border)',
      boxShadow: 'var(--shadow-lg)',
      background: '#000',
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Scanner overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {/* Crosshair */}
        <div style={{
          width: '60%', height: '60%',
          borderRadius: 16,
          border: '2px solid rgba(255,255,255,0.4)',
          position: 'relative',
        }}>
          {/* Corner highlights */}
          <div style={{ position:'absolute', top:-2, left:-2, width:24, height:24, borderTop:'3px solid var(--primary)', borderLeft:'3px solid var(--primary)', borderRadius:'8px 0 0 0' }}/>
          <div style={{ position:'absolute', top:-2, right:-2, width:24, height:24, borderTop:'3px solid var(--primary)', borderRight:'3px solid var(--primary)', borderRadius:'0 8px 0 0' }}/>
          <div style={{ position:'absolute', bottom:-2, left:-2, width:24, height:24, borderBottom:'3px solid var(--primary)', borderLeft:'3px solid var(--primary)', borderRadius:'0 0 0 8px' }}/>
          <div style={{ position:'absolute', bottom:-2, right:-2, width:24, height:24, borderBottom:'3px solid var(--primary)', borderRight:'3px solid var(--primary)', borderRadius:'0 0 8px 0' }}/>
        </div>
      </div>

      {/* Scanning label */}
      {scanning && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          padding: '6px 16px', borderRadius: 100,
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          <Scan size={14} style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
          Scanning…
        </div>
      )}
    </div>
  );
};
