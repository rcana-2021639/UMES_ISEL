export interface Course {
  id: number;
  carrera: string;
  nombre: string;
}

export interface CourseUpsertInput {
  carrera: string;
  nombre: string;
}
