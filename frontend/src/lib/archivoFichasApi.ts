import { http } from "@/lib/http";
import { descargarArchivo } from "@/lib/adminToolsApi";

/** Un reinicio de asignaciones y el ZIP con los PDF de las fichas que dejó. */
export interface ArchivoFichas {
  id: number;
  etiqueta: string;
  estado: "generando" | "listo" | "error";
  cantidadFichas: number;
  bytes: number;
  /** En "error": por qué falló. En "listo": un aviso, si alguna ficha no pudo salir en PDF. */
  error: string | null;
  creadoPor: string;
  creadoEn: string;
  terminadoEn: string | null;
  /** El ZIP está en el servidor y se puede descargar. */
  disponible: boolean;
}

/** Lo que se llevaría un reinicio ahora mismo: las cifras que enseñan las alertas. */
export interface ResumenReinicio {
  totalFichas: number;
  impresas: number;
  pendientes: number;
  enCurso: boolean;
}

export const getArchivosFichas = (): Promise<ArchivoFichas[]> => http.get("/api/archivo-fichas");

export const getResumenReinicio = (): Promise<ResumenReinicio> => http.get("/api/archivo-fichas/resumen");

/** `confirmacion` tiene que ser la palabra REINICIAR: el servidor la vuelve a comprobar. */
export const reiniciarAsignaciones = (etiqueta: string, confirmacion: string): Promise<ArchivoFichas> =>
  http.post("/api/archivo-fichas/reiniciar", { etiqueta, confirmacion });

export const descargarArchivoFichas = (a: ArchivoFichas): Promise<void> =>
  descargarArchivo(`/api/archivo-fichas/${a.id}/descargar`, `Fichas - ${a.etiqueta}.zip`);
