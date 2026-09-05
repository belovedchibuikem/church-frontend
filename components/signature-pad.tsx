'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

type SignaturePadProps = {
  height?: number;
  disabled?: boolean;
  onChange?: (dataUrl: string | null) => void;
};

export function SignaturePad({ height = 130, disabled = false, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const rect = parent?.getBoundingClientRect();
    const cssWidth = Math.max(280, Math.floor(rect?.width ?? 420));
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = cssWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssWidth, height);
    setReady(true);
  }, [height]);

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onChange) return;
    onChange(hasInkRef.current ? canvas.toDataURL('image/png') : null);
  };

  const pointOf = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDraw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = pointOf(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = pointOf(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    hasInkRef.current = true;
  };

  const endDraw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (drawingRef.current) {
      drawingRef.current = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        /* pointer capture can already be released */
      }
      emit();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasInkRef.current = false;
    emit();
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="kca-signature-canvas"
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerCancel={endDraw}
        onPointerLeave={endDraw}
      />
      <button className="ghost-button" type="button" onClick={clear} disabled={!ready || disabled}>
        Clear
      </button>
    </div>
  );
}
