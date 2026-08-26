import { API_BASE } from "@/lib/config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Pulls a human-readable message out of either a plain-text or ASP.NET ProblemDetails error body. */
async function readError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `Error ${res.status}`;
  try {
    const json = JSON.parse(text);
    if (json.errors) {
      const first = Object.values(json.errors).flat()[0];
      if (typeof first === "string") return first;
    }
    if (typeof json.title === "string") return json.title;
  } catch {
    // not JSON — plain text message from the controller (e.g. NotFound("..."))
  }
  return text;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    throw new ApiError(await readError(res), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
};
