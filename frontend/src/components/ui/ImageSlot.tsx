import { useState } from "react";

interface ImageSlotProps {
  /** Path relative to /public, e.g. "/images/programs/fintech.jpg" */
  src: string;
  alt: string;
  label?: string;
  className?: string;
}

/**
 * Renders the image if it exists in /public; otherwise renders a labeled
 * placeholder showing the exact file name/path expected — so the layout
 * never looks "broken" before real photos are dropped in, and whoever
 * uploads them knows precisely where each one goes.
 *
 * Usage: drop the real file into frontend/public/images/... using the
 * exact name shown in the placeholder, no code changes needed.
 */
export function ImageSlot({ src, alt, label, className = "" }: ImageSlotProps) {
  const [failed, setFailed] = useState(false);
  const fileName = src.split("/").pop();

  if (failed) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-isel-navy/25 bg-isel-navy/[0.035] px-6 py-10 text-center ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-8 w-8 text-isel-navy/35"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5-9 9" />
        </svg>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-isel-navy/55">
          {label ?? "Imagen pendiente"}
        </p>
        <code className="rounded bg-isel-navy/10 px-2 py-1 text-[11px] leading-relaxed text-isel-navy/70 break-all">
          {fileName}
        </code>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
