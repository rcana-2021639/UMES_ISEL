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
