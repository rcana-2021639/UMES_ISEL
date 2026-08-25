import type { MasterProgram } from "@/types/program";
import { programs as localPrograms } from "@/data/programs";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5199";

/**
 * Fetches with a short timeout and falls back to the bundled local data
 * (src/data/programs.ts) whenever the .NET API isn't running — the page
 * should never show a broken/empty state just because the backend is down.
 */
async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function getPrograms(): Promise<MasterProgram[]> {
  return safeFetch(`${API_BASE}/api/programs`, localPrograms);
}

export async function getProgramBySlug(slug: string): Promise<MasterProgram | undefined> {
  const fallback = localPrograms.find((p) => p.slug === slug);
  return safeFetch(`${API_BASE}/api/programs/${slug}`, fallback);
}
