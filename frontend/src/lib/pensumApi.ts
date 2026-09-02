import { http } from "@/lib/http";

/** Un curso del pénsum, tal como se edita en la pestaña "Pénsum" del admin. */
export interface PensumCurso {
  id: number;
  trimestre: number;
  nombre: string;
}

export interface PensumTrimestre {
  trimestre: number;
  cursos: PensumCurso[];
}

/** Cuántos expedientes vivos apuntan a la carrera — decide si se puede borrar o solo archivar. */
export interface PensumUso {
  alumnos: number;
  fichas: number;
  aspirantes: number;
  total: number;
}

export interface PensumCarrera {
  id: number;
  nombre: string;
  tipo: string;
  esPrograma: boolean;
  activa: boolean;
  orden: number;
  trimestres: PensumTrimestre[];
  totalCursos: number;
  uso: PensumUso;
}

/** La forma ligera que consumen los selectores de carrera de los tres trámites. */
export interface CarreraOpcion {
  id: number;
  nombre: string;
  tipo: string;
  esPrograma: boolean;
  orden: number;
}

export interface CarreraPayload {
  nombre: string;
  tipo: string;
  esPrograma: boolean;
  activa: boolean;
}

export interface CursoPayload {
  trimestre: number;
  nombre: string;
}

/**
 * Todas las escrituras devuelven el pénsum completo ya recalculado, no un "OK".
 * Así la pantalla nunca tiene que adivinar cómo quedó el árbol después de un
 * renombrado en cascada o de borrar un trimestre entero: pinta lo que llegó.
 */
export const getPensum = (): Promise<PensumCarrera[]> => http.get("/api/pensum");

/**
 * Las carreras para los selectores públicos. `soloProgramas` deja fuera los
 * grupos de cursos sueltos (Inglés), en los que nadie se inscribe.
 */
export const getCarreraOpciones = (soloProgramas = true): Promise<CarreraOpcion[]> =>
  http.get(`/api/pensum/carreras?soloProgramas=${soloProgramas}`);

export const crearCarrera = (body: CarreraPayload): Promise<PensumCarrera[]> =>
  http.post("/api/pensum/carreras", body);

export const actualizarCarrera = (id: number, body: CarreraPayload): Promise<PensumCarrera[]> =>
  http.put(`/api/pensum/carreras/${id}`, body);

export const eliminarCarrera = (id: number): Promise<PensumCarrera[]> =>
  http.del<PensumCarrera[]>(`/api/pensum/carreras/${id}`);

export const reordenarCarreras = (ids: number[]): Promise<PensumCarrera[]> =>
  http.put("/api/pensum/carreras/orden", { ids });

export const crearCurso = (carreraId: number, body: CursoPayload): Promise<PensumCarrera[]> =>
  http.post(`/api/pensum/carreras/${carreraId}/cursos`, body);

export const actualizarCurso = (cursoId: number, body: CursoPayload): Promise<PensumCarrera[]> =>
  http.put(`/api/pensum/cursos/${cursoId}`, body);

export const eliminarCurso = (cursoId: number): Promise<PensumCarrera[]> =>
  http.del<PensumCarrera[]>(`/api/pensum/cursos/${cursoId}`);

export const eliminarTrimestre = (carreraId: number, trimestre: number): Promise<PensumCarrera[]> =>
  http.del<PensumCarrera[]>(`/api/pensum/carreras/${carreraId}/trimestres/${trimestre}`);
