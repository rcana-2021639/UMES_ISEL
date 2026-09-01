import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

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
  /** Solo lectura: se ve la firma guardada pero no se puede trazar encima. */
  readOnly?: boolean;
}

function setupContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0A2B24"; // isel-navy — tinta de pluma, sin degradado
  return ctx;
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
  { initialValue, onChange, className = "", readOnly = false },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasStroke = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  /**
   * Ajusta el lienzo a su caja CSS, a la resolución de la pantalla, conservando lo dibujado.
   *
   * Se vuelve a llamar cada vez que la caja cambia de tamaño, no solo al montar: si el pad nace sin
   * medida —dentro de un panel que aún se está abriendo, una pestaña oculta, una ventana que todavía
   * no ha maquetado— el lienzo se quedaba con esa medida de 0 para siempre, y la firma se guardaba
   * como una tira de dos píxeles. Cambiar el tamaño de un canvas lo borra, así que lo trazado se
   * recoge antes y se vuelve a pintar a la medida nueva.
   */
  const ajustarLienzo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const ancho = Math.round(rect.width * ratio);
    const alto = Math.round(rect.height * ratio);
    if (ancho === 0 || alto === 0) return; // todavía sin maquetar: se reintenta cuando crezca
    if (canvas.width === ancho && canvas.height === alto) return;

    const previo = hasStroke.current && canvas.width > 1 && canvas.height > 1 ? canvas.toDataURL("image/png") : null;
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = setupContext(canvas);
    if (!ctx) return;
    if (previo) {
      const img = new Image();
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, ancho, alto);
        ctx.scale(ratio, ratio);
      };
      img.src = previo;
    }
    ctx.scale(ratio, ratio);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ajustarLienzo();
    const ctx = setupContext(canvas);

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        if (!ctx) return;
        // La firma guardada se pinta en píxeles del lienzo, no en píxeles CSS: por eso se aparta la
        // escala mientras dura el dibujo y se devuelve con `restore` — que ya la trae puesta. (Antes
        // se volvía a escalar después de restaurarla, y en pantallas de mucha densidad el lienzo
        // acababa al cuadrado: los trazos nuevos caían lejos del cursor.)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        hasStroke.current = true;
        setIsEmpty(false);
      };
      img.src = initialValue;
    }

    // El pad puede nacer sin medida y crecer después; el lienzo tiene que enterarse.
    const observer = new ResizeObserver(() => ajustarLienzo());
    observer.observe(canvas);
    return () => observer.disconnect();
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
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(canvas, e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !drawing.current) return;
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
    const estabaTrazando = drawing.current;
    drawing.current = false;
    lastPoint.current = null;
    // Al soltar, no solo al primer trazo: quien escucha guarda el lienzo tal como quedó, así una
    // firma de varios trazos no se queda con la foto del primero.
    if (estabaTrazando && hasStroke.current) onChange?.(true);
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className={`h-44 w-full touch-none rounded-xl border border-dashed border-isel-line bg-white transition-colors duration-300 ease-crisp ${
          readOnly ? "cursor-default opacity-90" : "cursor-crosshair hover:border-isel-emerald/45"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      />
      {isEmpty && (
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-isel-ink/30">
          {/* Renglón de firma: dice dónde va sin escribir "escribe aquí". */}
          <span aria-hidden className="h-px w-2/3 bg-isel-line" />
          <span className="text-[12.5px]">
            {readOnly ? "Sin firma registrada" : "Firma con el mouse, el lápiz óptico o el dedo"}
          </span>
        </span>
      )}
    </div>
  );
});
