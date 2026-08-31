export interface Student {
  id: number;
  carnet: string;
  primerApellido: string;
  segundoApellido?: string | null;
  primerNombre: string;
  segundoNombre?: string | null;
  nombreCompleto: string;
  carrera: string;
  seccion?: string | null;
  trimestre?: number | null;
  correoInstitucional?: string | null;
  correoPersonal?: string | null;
  celular?: string | null;
  /** Respuesta a "¿Tiene su papelería al día?" — si es true no se pide subir nada. */
  papeleriaEnOrden: boolean;
  /** Cuántos de los documentos de la carta de compromiso ya se subieron. */
  documentosSubidos: number;
}

/** Every field the admin's "Agregar / editar alumno" form must collect. */
export interface StudentUpsertInput {
  carnet: string;
  primerApellido: string;
  segundoApellido?: string | null;
  primerNombre: string;
  segundoNombre?: string | null;
  carrera: string;
  seccion?: string | null;
  trimestre?: number | null;
  correoInstitucional?: string | null;
  correoPersonal?: string | null;
  celular?: string | null;
}
