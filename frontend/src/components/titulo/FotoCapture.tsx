import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/portal/Icon";
import { Alert, PortalButton, Segmented } from "@/components/portal/kit";
import { FOTO_ASPECTO } from "@/types/solicitudTitulo";

/**
 * La fotografía del recuadro "PEGAR FOTOGRAFÍA RECIENTE".
 *
 * El recuadro del FORMATO mide 3.5 x 4.5 cm; si la foto llega con otra proporción, o se deforma o
 * deja franjas blancas. Por eso aquí nunca se acepta una imagen "tal cual": venga de la cámara o de
 * un archivo, siempre pasa por el mismo encuadre de proporción fija, con zoom y arrastre, y sale
 * recortada a <see cref="SALIDA_ANCHO"/>x<see cref="SALIDA_ALTO"/> px en JPEG. Ese recorte es
 * exactamente el hueco del papel, así que el backend solo tiene que pegarla.
 *
 * Un solo `dibujar()` sirve para la vista previa y para la exportación: si el encuadre se calculara
 * dos veces (una en CSS para mirar, otra en canvas para guardar) acabarían separándose y el alumno
 * vería una cosa y se imprimiría otra.
 */

/** Tamaño de salida: ~500 ppp sobre 3.5 x 4.5 cm. Sobra para imprimir y pesa ~120 KB en JPEG. */
const SALIDA_ANCHO = 700;
const SALIDA_ALTO = Math.round(SALIDA_ANCHO / FOTO_ASPECTO);

/** Tope del archivo que se sube. Lo que entra se reencuadra igual, así que esto solo frena barbaridades. */
const MAX_ARCHIVO_BYTES = 12 * 1024 * 1024;

interface Encuadre {
  zoom: number;
  panX: number;
  panY: number;
}

const ENCUADRE_INICIAL: Encuadre = { zoom: 1, panX: 0, panY: 0 };

/**
 * Dibuja la imagen recortada "a cubrir" el lienzo, con el zoom y el desplazamiento pedidos.
 * `panX`/`panY` van de -1 a 1 sobre el sobrante, así el encuadre se mantiene al mover el zoom.
 */
function dibujar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, enc: Encuadre, W: number, H: number) {
  const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const escala = base * enc.zoom;
  const dw = img.naturalWidth * escala;
  const dh = img.naturalHeight * escala;
  const ox = (W - dw) / 2 + (enc.panX * (dw - W)) / 2;
  const oy = (H - dh) / 2 + (enc.panY * (dh - H)) / 2;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, ox, oy, dw, dh);
}

type Modo = "camara" | "archivo";

export function FotoCapture({
  value,
  onChange,
  readOnly = false,
}: {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  readOnly?: boolean;
}) {
  const [modo, setModo] = useState<Modo>("camara");
  const [error, setError] = useState<string | null>(null);
  /** Imagen en bruto pendiente de encuadrar (de la cámara o del archivo). */
  const [fuente, setFuente] = useState<HTMLImageElement | null>(null);
  const [encuadre, setEncuadre] = useState<Encuadre>(ENCUADRE_INICIAL);
  const [camaraLista, setCamaraLista] = useState(false);
  const [destello, setDestello] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const arrastre = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraLista(false);
  }, []);

  // La cámara solo vive mientras se está usando: ni con una foto ya tomada ni en modo archivo.
  useEffect(() => {
    if (readOnly || modo !== "camara" || fuente || value) {
      detenerCamara();
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamaraLista(true);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        setCamaraLista(false);
        const nombre = e instanceof DOMException ? e.name : "";
        setError(
          nombre === "NotAllowedError"
            ? "No se otorgó permiso para utilizar la cámara. Puede habilitarlo desde la barra de direcciones del navegador o adjuntar una fotografía desde su dispositivo."
            : nombre === "NotFoundError"
              ? "No se detectó ninguna cámara en este dispositivo. Adjunte una fotografía desde sus archivos."
              : "No fue posible abrir la cámara. Adjunte una fotografía desde sus archivos.",
        );
      }
    })();
    return () => {
      cancelado = true;
      detenerCamara();
    };
  }, [modo, fuente, value, readOnly, detenerCamara]);

  useEffect(() => detenerCamara, [detenerCamara]);

  // Vista previa del encuadre — el mismo dibujo que se exportará.
  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo || !fuente) return;
    const ctx = lienzo.getContext("2d");
    if (ctx) dibujar(ctx, fuente, encuadre, lienzo.width, lienzo.height);
  }, [fuente, encuadre]);

  function cargarImagen(dataUrl: string) {
    const img = new Image();
    img.onload = () => {
      setFuente(img);
      setEncuadre(ENCUADRE_INICIAL);
      setError(null);
    };
    img.onerror = () => setError("No pudimos leer esa imagen. Prueba con otro archivo (JPG o PNG).");
    img.src = dataUrl;
  }

  function tomarFoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    // La cámara frontal se ve en espejo; se voltea al capturar para que la foto salga como te ven.
    ctx.translate(lienzo.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setDestello(true);
    window.setTimeout(() => setDestello(false), 320);
    cargarImagen(lienzo.toDataURL("image/jpeg", 0.95));
  }

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen. Adjunte un archivo JPG o PNG.");
      return;
    }
    if (file.size > MAX_ARCHIVO_BYTES) {
      setError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo son ${MAX_ARCHIVO_BYTES / 1024 / 1024} MB. Usa una foto más liviana.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => cargarImagen(String(reader.result));
    reader.onerror = () => setError("No pudimos leer ese archivo.");
    reader.readAsDataURL(file);
  }

  function confirmar() {
    if (!fuente) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = SALIDA_ANCHO;
    lienzo.height = SALIDA_ALTO;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    dibujar(ctx, fuente, encuadre, SALIDA_ANCHO, SALIDA_ALTO);
    onChange(lienzo.toDataURL("image/jpeg", 0.9));
    setFuente(null);
    setEncuadre(ENCUADRE_INICIAL);
  }

  function quitar() {
    onChange(null);
    setFuente(null);
    setEncuadre(ENCUADRE_INICIAL);
  }

  // ---- arrastre del encuadre ----
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!fuente || encuadre.zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, panX: encuadre.panX, panY: encuadre.panY };
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = arrastre.current;
    if (!d || !fuente) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const base = Math.max(SALIDA_ANCHO / fuente.naturalWidth, SALIDA_ALTO / fuente.naturalHeight);
    const escala = base * encuadre.zoom;
    const sobranteX = fuente.naturalWidth * escala - SALIDA_ANCHO;
    const sobranteY = fuente.naturalHeight * escala - SALIDA_ALTO;
    // De píxeles en pantalla a la escala del lienzo de salida.
    const factor = SALIDA_ANCHO / rect.width;
    const dx = sobranteX > 0 ? ((e.clientX - d.x) * factor * 2) / sobranteX : 0;
    const dy = sobranteY > 0 ? ((e.clientY - d.y) * factor * 2) / sobranteY : 0;
    setEncuadre((enc) => ({
      ...enc,
      panX: Math.max(-1, Math.min(1, d.panX - dx)),
      panY: Math.max(-1, Math.min(1, d.panY - dy)),
    }));
  }
  function onPointerUp() {
    arrastre.current = null;
  }

  const marco = "relative overflow-hidden rounded-2xl border border-isel-line bg-isel-navy/[0.04]";
  const anchoMarco = "w-[15.5rem]";

  /* --------------------------------------------------------- foto ya elegida */
  if (value && !fuente) {
    return (
      <div className="flex flex-wrap items-start gap-6">
        <div className={`${marco} ${anchoMarco} shrink-0 border-isel-emerald/40 shadow-card`} style={{ aspectRatio: FOTO_ASPECTO }}>
          <img src={value} alt="Fotografía para la solicitud" className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />
        </div>
        <div className="min-w-[13rem] flex-1">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-emerald2">
            <Icon name="check" size={16} />
            Fotografía lista
          </p>
          <p className="mt-2 max-w-[38ch] text-[13px] leading-relaxed text-isel-ink/55">
            Ya está recortada a 3.5 × 4.5 cm, la medida exacta del recuadro de la ficha. Se colocará sola al imprimir.
          </p>
          {!readOnly && (
            <div className="mt-5 flex flex-wrap gap-2">
              <PortalButton tone="ghost" size="sm" icon="repeat" onClick={quitar}>
                Cambiar fotografía
              </PortalButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className={`${marco} ${anchoMarco} flex items-center justify-center`} style={{ aspectRatio: FOTO_ASPECTO }}>
        <p className="px-4 text-center text-[12.5px] text-isel-ink/40">Sin fotografía</p>
      </div>
    );
  }

  /* ------------------------------------------------------------- encuadrando */
  if (fuente) {
    return (
      <div className="flex flex-wrap items-start gap-6">
        <div className="shrink-0">
          <div className={`${marco} ${anchoMarco} border-isel-gold/50 shadow-card`} style={{ aspectRatio: FOTO_ASPECTO }}>
            <canvas
              ref={lienzoRef}
              width={SALIDA_ANCHO}
              height={SALIDA_ALTO}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`h-full w-full ${encuadre.zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
            />
            <GuiaRostro />
          </div>
          <p className="mt-2 text-center text-[11.5px] text-isel-ink/45">
            {encuadre.zoom > 1 ? "Arrastra para mover · " : ""}Ajusta con el zoom
          </p>
        </div>

        <div className="min-w-[13rem] flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">Encuadre su rostro</p>
          <p className="mt-2 max-w-[40ch] text-[13px] leading-relaxed text-isel-ink/55">
            Deja la cabeza dentro del óvalo y los hombros dentro del marco. Lo que veas aquí es exactamente lo que se
            imprimirá.
          </p>

          <label className="mt-5 block">
            <span className="mb-2 flex items-center justify-between text-[11.5px] font-semibold text-isel-ink/55">
              Zoom
              <span className="tabular text-isel-ink/35">{encuadre.zoom.toFixed(1)}×</span>
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={encuadre.zoom}
              onChange={(e) => setEncuadre((enc) => ({ ...enc, zoom: Number(e.target.value) }))}
              className="w-full accent-isel-gold2"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            <PortalButton tone="accent" icon="check" onClick={confirmar}>
              Usar esta fotografía
            </PortalButton>
            <PortalButton tone="ghost" icon="close" onClick={() => setFuente(null)}>
              Descartar
            </PortalButton>
          </div>
          {error && (
            <div className="mt-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------- cámara / subir archivo */
  return (
    <div>
      <Segmented
        value={modo}
        onChange={(m) => {
          setModo(m);
          setError(null);
        }}
        options={[
          { value: "camara" as const, label: "Tomar foto" },
          { value: "archivo" as const, label: "Subir archivo" },
        ]}
      />

      <div className="mt-5 flex flex-wrap items-start gap-6">
        <div className="shrink-0">
          <div className={`${marco} ${anchoMarco} shadow-card`} style={{ aspectRatio: FOTO_ASPECTO }}>
            {modo === "camara" ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full scale-x-[-1] object-cover"
                  style={{ opacity: camaraLista ? 1 : 0, transition: "opacity 500ms ease" }}
                />
                {!camaraLista && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-isel-navy/[0.07] text-isel-ink/40">
                      <Icon name="user" size={20} />
                    </span>
                    <p className="text-[12px] leading-relaxed text-isel-ink/45">
                      {error ? "Cámara no disponible" : "Encendiendo la cámara…"}
                    </p>
                  </div>
                )}
                <GuiaRostro />
                {/* Destello del obturador. */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-300 ease-crisp ${
                    destello ? "opacity-90" : "opacity-0"
                  }`}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => archivoRef.current?.click()}
                className="group/subir absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center transition-colors duration-300 ease-crisp hover:bg-isel-gold/[0.06]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-isel-ink/25 text-isel-ink/40 transition-[border-color,color,transform] duration-500 ease-snap group-hover/subir:-translate-y-0.5 group-hover/subir:border-isel-gold2 group-hover/subir:text-isel-gold2">
                  <Icon name="upload" size={20} />
                </span>
                <span className="text-[12.5px] font-semibold text-isel-navy">Elegir una imagen</span>
                <span className="text-[11.5px] leading-snug text-isel-ink/40">JPG o PNG · hasta 12 MB</span>
              </button>
            )}
            <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06]" />
          </div>
          <p className="mt-2 text-center text-[11.5px] text-isel-ink/45">3.5 × 4.5 cm · como en la ficha</p>
        </div>

        <div className="min-w-[13rem] flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">Fotografía reciente</p>
          <ul className="mt-3 space-y-2">
            {[
              "Fondo claro y liso, sin filtros.",
              "Rostro de frente, sin lentes oscuros ni gorra.",
              "Hombros visibles, buena luz de frente.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-isel-ink/55">
                <Icon name="check" size={13} className="mt-1 shrink-0 text-isel-gold2" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            {modo === "camara" ? (
              <PortalButton tone="accent" icon="sparkle" disabled={!camaraLista} onClick={tomarFoto}>
                Tomar la fotografía
              </PortalButton>
            ) : (
              <PortalButton tone="accent" icon="upload" onClick={() => archivoRef.current?.click()}>
                Elegir archivo
              </PortalButton>
            )}
            <input ref={archivoRef} type="file" accept="image/*" className="hidden" onChange={elegirArchivo} />
          </div>

          {error && (
            <div className="mt-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Óvalo y línea de cabeza: la misma guía que usa una cabina de fotos de pasaporte. */
function GuiaRostro() {
  return (
    <svg viewBox="0 0 100 127" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <ellipse cx="50" cy="52" rx="27" ry="35" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="3 3" />
      <ellipse cx="50" cy="52" rx="27" ry="35" fill="none" stroke="#0C332A" strokeOpacity="0.28" strokeWidth="0.4" />
      <line x1="14" y1="17" x2="86" y2="17" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.5" strokeDasharray="2 4" />
      <line x1="14" y1="103" x2="86" y2="103" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.5" strokeDasharray="2 4" />
    </svg>
  );
}
