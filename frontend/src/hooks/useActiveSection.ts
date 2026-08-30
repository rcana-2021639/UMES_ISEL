import { useEffect, useState } from "react";

/**
 * Devuelve el id de la sección visible en pantalla. Se usa para mover el
 * indicador de la navegación: en vez de un hover suelto, la barra siempre
 * dice en qué parte de la página está el lector.
 */
export function useActiveSection(ids: string[], offset = 0.35): string {
  const [active, setActive] = useState(ids[0] ?? "");
  const key = ids.join(",");

  useEffect(() => {
    const sections = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const top = Math.round(offset * 100);
    const bottom = Math.max(0, 100 - top - 15);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: `-${top}% 0px -${bottom}% 0px`, threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [key, offset]);

  return active;
}
