import type { AdditionalCourseRow, AssignedCourseRow, TipoPago } from "@/types/courseAssignment";

/** Uno de los seis valores de "Pueblo de Pertenencia" de la ficha de preinscripción. */
export type PuebloPertenencia = "Maya" | "Garifuna" | "Extranjero" | "Xinka" | "Ladino" | "Afroascendiente";

export interface Preinscripcion {
  nombreCompleto: string;
  dpi?: string | null;
  noPasaporte?: string | null;
  carrera: string;
  jornada?: string | null;
  fechaNacimiento?: string | null; // yyyy-MM-dd
  genero?: string | null;
  lugarNacimiento?: string | null;
  nacionalidad?: string | null;
  direccionCompleta?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  estadoCivil?: string | null;
  comunidadLinguistica?: string | null;
  puebloPertenencia?: PuebloPertenencia | null;
  idiomaMaterno?: string | null;
  correoElectronico?: string | null;
  telefonoCelular?: string | null;
  telefonoCasa?: string | null;
  emergencia1Nombre?: string | null;
  emergencia1Telefono?: string | null;
  emergencia2Nombre?: string | null;
  emergencia2Telefono?: string | null;
  tieneAlergia: boolean;
  alergiaDescripcion?: string | null;
  tieneProblemaSalud: boolean;
  saludDescripcion?: string | null;
  firmaBase64?: string | null;
  firmadoEn?: string | null;
}

export type PreinscripcionInput = Omit<Preinscripcion, "firmadoEn">;

export interface AsignacionNuevoIngreso {
  primerApellido: string;
  segundoApellido?: string | null;
  primerNombre: string;
  segundoNombre?: string | null;
  fecha: string;
  trimestre: number;
  carrera: string;
  seccion?: string | null;
  cursosAsignados: AssignedCourseRow[];
  cursosAdicionales: AdditionalCourseRow[];
  tienePendientesTrimestres: boolean;
  tienePendientesMaterias: boolean;
  correoContacto?: string | null;
  telefonoContacto?: string | null;
  /** "Link" | "Presencial" — igual que en la ficha del alumno ya inscrito; no se imprime. */
  tipoPago?: TipoPago | null;
  firmaBase64?: string | null;
  firmadoEn?: string | null;
}

export type AsignacionNuevoIngresoInput = Omit<AsignacionNuevoIngreso, "fecha" | "firmadoEn">;

export interface CartaCompromiso {
  fecha: string;
  carrera: string;
  esExtranjero: boolean;
  nombreCompleto: string;
  noDpi: string;
  firmaBase64?: string | null;
  firmadoEn?: string | null;
}

export type CartaCompromisoInput = Omit<CartaCompromiso, "fecha" | "firmadoEn">;

/** Claves de documento — deben calzar con DocumentoTipos en el backend (Models/Entities/Inscripcion.cs). */
export const DOCUMENTO_TIPOS_NACIONAL = ["DpiAutenticado", "Fotos", "TituloMedio", "TituloLicenciatura"] as const;
export const DOCUMENTO_TIPOS_EXTRANJERO = [
  "PasaporteCompleto",
  "FotosExtranjero",
  "TituloMedioExtranjero",
  "TituloPregrado",
] as const;

export type DocumentoTipo =
  | (typeof DOCUMENTO_TIPOS_NACIONAL)[number]
  | (typeof DOCUMENTO_TIPOS_EXTRANJERO)[number];

export const DOCUMENTO_LABELS: Record<DocumentoTipo, string> = {
  DpiAutenticado: "Fotocopia de DPI autenticada",
  Fotos: "2 fotografías en blanco y negro de 3x4 cm impresas en papel mate",
  TituloMedio: "Fotocopia autenticada del Título Nivel Medio",
  TituloLicenciatura: "Fotocopia autenticada del Título de Licenciatura",
  PasaporteCompleto: "Fotocopia de Pasaporte completo autenticado",
  FotosExtranjero: "2 fotografías en blanco y negro de 3x4 cm impresas en papel mate",
  TituloMedioExtranjero: "Fotocopia del Título a Nivel Medio autenticado, apostillado y con equiparación por el Ministerio de Educación",
  TituloPregrado: "Fotocopia del Título de Pre-Grado autenticado y apostillado",
};

export interface ApplicantDocument {
  tipo: DocumentoTipo;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Applicant {
  id: number;
  dpi?: string | null;
  pasaporte?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  primerNombre?: string | null;
  segundoNombre?: string | null;
  nombreCompleto?: string | null;
  esExtranjero: boolean;
  migradoStudentId?: number | null;
  migradoEn?: string | null;
  updatedAt: string;
  preinscripcion: Preinscripcion | null;
  asignacion: AsignacionNuevoIngreso | null;
  compromiso: CartaCompromiso | null;
  documentos: ApplicantDocument[];
}

/** Fila liviana de la tabla de admin — ver ApplicantListItemDto en el backend. */
export interface ApplicantListItem {
  id: number;
  dpi?: string | null;
  pasaporte?: string | null;
  nombreCompleto: string;
  carrera?: string | null;
  seccion?: string | null;
  trimestre?: number | null;
  esExtranjero: boolean;
  migrado: boolean;
  fichaCompleta: boolean;
  documentosSubidos: number;
  documentosRequeridos: number;
  fecha: string; // yyyy-MM-dd
}

export interface MigrarAspiranteInput {
  carnet: string;
  seccion?: string | null;
  trimestre?: number | null;
}
