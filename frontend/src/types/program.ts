/**
 * Mirrors UmesIsel.Api.Models (backend/UmesIsel.Api/Models/MasterProgram.cs) 1:1.
 * ASP.NET Core serializes record properties as camelCase JSON by default,
 * which is exactly what's typed here — keep both sides in sync if you add fields.
 */

export interface CostItem {
  label: string;
  value: string;
}

export interface StudyPlan {
  duracion: string;
  modalidad: string;
  tutorias: string;
  costos: CostItem[];
  notaCostos: string;
}

export interface MasterProgram {
  slug: string;
  title: string;
  tagline: string;
  cardImage: string;
  detailImage?: string;
  paragraphs: string[];
  pensumUrl: string;
  plan: StudyPlan;
}
