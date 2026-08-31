import { ApiError } from "@/lib/http";
import { API_BASE } from "@/lib/config";

/**
 * Fetches a PDF from the backend and sends it straight to the browser's native print dialog —
 * entirely inside the current tab, no external/new tab or window involved. Extraído de
 * assignmentsApi.ts para que inscripcionesApi.ts (y cualquier otro cliente) lo reutilice tal cual.
 *
 * How: load the PDF into a hidden `<iframe>` and call `.print()` on the iframe's own window once it
 * finishes loading. Chrome's (and Edge's) built-in PDF viewer honors that exactly like it would for a
 * full-page PDF, so the OS print dialog (e.g. "Microsoft Print to PDF") opens automatically — the
 * admin never sees a blank loading tab, just their same page and then the print dialog. This avoids
 * the popup-blocker dance a `window.open("", "_blank")` approach needs entirely: appending a hidden
 * iframe is never blocked, so there's no "must be a synchronous click, before any await" constraint.
 */
export async function openPdf(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    let message = text || `Error ${res.status}`;
    try {
      const problem = JSON.parse(text) as { detail?: string; title?: string };
      message = problem.detail || problem.title || message;
    } catch {
      // not JSON — keep the plain-text message
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  // A guard, not just tidiness: without it, two print dialogs could pop up back-to-back — see the
  // src-before-append note below for why that happened.
  let printed = false;
  iframe.onload = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Some browser/PDF-viewer combos don't support triggering print this way — the PDF is still
      // loaded, just without the automatic step; rare in practice on Chromium-based browsers.
    }
  };
  // Set `src` BEFORE inserting the iframe into the document, not after. An iframe inserted with no
  // `src` yet immediately starts loading "about:blank" and fires its own `load` event a moment
  // later; setting `src` only after insertion raced that empty-document load against the real PDF
  // load, so `onload` fired twice — once for "about:blank" (at that point the iframe has no real
  // content, so Chrome fell back to printing the whole tab behind it: a blank print of the admin
  // page) and once, correctly, moments later for the actual PDF, once the admin cancelled the first
  // dialog. Setting `src` first means the iframe navigates straight to the PDF on insertion, with no
  // separate "about:blank" load in between.
  iframe.src = url;
  document.body.appendChild(iframe);

  // Keep the blob URL and iframe alive long enough for the admin to actually use the print dialog
  // (pick a printer, hit Imprimir) before cleaning up — closing either too soon can cancel the job.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    iframe.remove();
  }, 5 * 60_000);
}
