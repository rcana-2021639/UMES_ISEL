export interface AssignedCourseRow {
  numero: number;
  curso: string;
  semTri?: string | null;
  seccion?: string | null;
}

export interface AdditionalCourseRow {
  numero: number;
  cursoAdicional: string;
  carrera?: string | null;
  semTri?: string | null;
  seccion?: string | null;
  jornada?: string | null;
}

/** The full "Ficha de Asignación de Cursos" as returned by the API. */
export interface CourseAssignment {
  id: number;
  studentId: number;
  carnet: string;
  nombreCompleto: string;
  primerApellido: string;
  segundoApellido?: string | null;
  primerNombre: string;
  segundoNombre?: string | null;
  fecha: string; // yyyy-MM-dd
  trimestre: number;
  carrera: string;
  seccion?: string | null;
  cursosAsignados: AssignedCourseRow[];
  cursosAdicionales: AdditionalCourseRow[];
  tienePendientesTrimestres: boolean;
  tienePendientesMaterias: boolean;
  correoContacto?: string | null;
  telefonoContacto?: string | null;
  comprobantePagoNo?: string | null;
  firmaBase64?: string | null;
  firmadoEn?: string | null;
  autorizadoPorCodigo?: string | null;
  updatedAt: string;
}

/** Body sent to save/update a ficha (student portal or admin edit). */
export interface CourseAssignmentUpsertInput {
  carnet: string;
  trimestre: number;
  cursosAsignados: AssignedCourseRow[];
  cursosAdicionales: AdditionalCourseRow[];
  tienePendientesTrimestres: boolean;
  tienePendientesMaterias: boolean;
  correoContacto?: string | null;
  telefonoContacto?: string | null;
  comprobantePagoNo?: string | null;
  firmaBase64?: string | null;
  autorizadoPorCodigo?: string | null;
}

export interface AssignmentStatusRow {
  estado: "Enviada" | "Pendiente";
  carnet: string;
  alumno: string;
  carrera: string;
  semTri: number | null;
}
