import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface SignaturePadHandle {
  /** PNG data URL, or null if nothing has been drawn. */
  getSignature: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  /** An existing signature to preload (e.g. reopening a saved ficha). */
  initialValue?: string | null;
  onChange?: (hasSignature: boolean) => void;
  className?: string;
}

function getPoint(canvas: HTMLCanvasElement, e: PointerEvent | React.PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

/**
 * Canvas-based digital signature capture — draw with mouse, pen, or touch.
 * No external dependency: pointer events + a smoothed line, "toDataURL" for
 * a PNG the backend stores verbatim on CourseAssignment.FirmaBase64.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { initialValue, onChange, className = "" },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasStroke = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const setupContext = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0A2B24"; // isel-navy — tinta de pluma, sin degradado
    return ctx;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Render at device pixel ratio for a crisp line, sized to its CSS box.
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = setupContext(canvas);
    if (ctx) ctx.scale(ratio, ratio);

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx?.save();
        if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx?.restore();
        if (ctx) ctx.scale(ratio, ratio);
        hasStroke.current = true;
        setIsEmpty(false);
      };
      img.src = initialValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getSignature: () => (hasStroke.current ? canvasRef.current?.toDataURL("image/png") ?? null : null),
    isEmpty: () => !hasStroke.current,
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke.current = false;
      setIsEmpty(true);
      onChange?.(false);
    },
  }));

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(canvas, e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getPoint(canvas, e);
    const ratio = window.devicePixelRatio || 1;
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x / ratio, lastPoint.current.y / ratio);
      ctx.lineTo(point.x / ratio, point.y / ratio);
      ctx.stroke();
    }
    lastPoint.current = point;
    if (!hasStroke.current) {
      hasStroke.current = true;
      setIsEmpty(false);
      onChange?.(true);
    }
  };

  const endStroke = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-44 w-full cursor-crosshair touch-none rounded-xl border border-dashed border-isel-line bg-white transition-colors duration-300 ease-crisp hover:border-isel-emerald/45"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      />
      {isEmpty && (
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-isel-ink/30">
          {/* Renglón de firma: dice dónde va sin escribir "escribe aquí". */}
          <span aria-hidden className="h-px w-2/3 bg-isel-line" />
          <span className="text-[12.5px]">Firma con el mouse, el lápiz óptico o el dedo</span>
        </span>
      )}
    </div>
  );
});
