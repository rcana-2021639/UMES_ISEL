/**
 * "Solicitud de Impresión de Título" — espejo de SolicitudTituloDtos.cs.
 *
 * El FORMATO oficial escribe el carné, los nombres y los apellidos LETRA POR LETRA, cada una en su
 * casilla. De ahí que aquí vivan los tres topes: no son una decisión de diseño nuestra, son las
 * casillas que trae el papel, y el formulario los muestra en vivo para que nadie se lleve la
 * sorpresa al imprimir.
 */
export const CASILLAS_CARNET = 13;
export const CASILLAS_NOMBRES = 37;
export const CASILLAS_APELLIDOS = 37;

/** Proporción del recuadro "PEGAR FOTOGRAFÍA RECIENTE" (3.5 x 4.5 cm) — el recorte usa esta cifra. */
export const FOTO_ASPECTO = 1285875 / 1637030;

export type CampusSolicitud =
  | "Central"
  | "Quetzaltenango"
  | "CentroSalesiano"
  | "AltaVerapaz"
  | "Morales"
  | "Honduras";

/** Las seis sedes del encabezado, en el orden en que están impresas en la ficha. */
export const CAMPUS_OPCIONES: { value: CampusSolicitud; label: string }[] = [
  { value: "Central", label: "Campus Central" },
  { value: "Quetzaltenango", label: "Campus Quetzaltenango" },
  { value: "CentroSalesiano", label: "Centro Salesiano de Estudios Superiores" },
  { value: "AltaVerapaz", label: "Campus Alta Verapaz" },
  { value: "Morales", label: "Campus Morales, Izabal" },
  { value: "Honduras", label: "Campus Diócesis de Gracias, Honduras" },
];

export interface SolicitudTitulo {
  id: number;
  studentId: number;
  carnet: string;
  nombreCompletoAlumno: string;
  carreraAlumno: string;
  campus?: CampusSolicitud | null;
  fechaSolicitud: string; // yyyy-MM-dd
  participaCeremonia: boolean;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string | null;
  estadoCivil?: string | null;
  sexo?: "F" | "M" | null;
  direccionDomicilio?: string | null;
  telefonoDomicilio?: string | null;
  telefonoCelular?: string | null;
  telefonoEmergencia?: string | null;
  correoElectronico?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  direccionTrabajo?: string | null;
  telefonoTrabajo?: string | null;
  facultadDepartamento?: string | null;
  tituloObtener?: string | null;
  fotoBase64?: string | null;
  firmaBase64?: string | null;
  firmadoEn?: string | null;
  entregada: boolean;
  entregadaEn?: string | null;
  updatedAt: string;
}

/** Lo que se manda al guardar — el servidor calcula carné, fecha y sellos. */
export type SolicitudTituloInput = Omit<
  SolicitudTitulo,
  | "id"
  | "studentId"
  | "carnet"
  | "nombreCompletoAlumno"
  | "carreraAlumno"
  | "fechaSolicitud"
  | "firmadoEn"
  | "entregada"
  | "entregadaEn"
  | "updatedAt"
>;

/** Fila liviana de la tabla del panel de admin — sin foto ni firma. */
export interface SolicitudTituloListItem {
  id: number;
  carnet: string;
  nombreCompletoAlumno: string;
  carreraAlumno: string;
  campus?: CampusSolicitud | null;
  fechaSolicitud: string;
  participaCeremonia: boolean;
  tieneFoto: boolean;
  tieneFirma: boolean;
  completa: boolean;
  entregada: boolean;
}

export type EstadoSolicitudTitulo = "todas" | "completa" | "pendiente" | "entregada";
