import { useEffect, useState } from "react";

/**
 * ¿Conviene enfocar solo el campo al abrir la pantalla?
 *
 * En una computadora sí: el cursor ya está donde hay que escribir. En un
 * teléfono no, y por dos razones concretas que se veían en las tres puertas de
 * entrada (inscripción, solicitud de título y portal): el navegador desplaza la
 * página hasta el campo enfocado, así que la persona llegaba directamente al
 * cuadro de texto sin haber visto el encabezado ni la explicación de lo que va
 * a hacer; y encima el teclado se abre solo y tapa media pantalla.
 *
 * Se decide con `pointer: fine` (ratón o lápiz) en vez de con el ancho: un
 * teléfono en horizontal sigue siendo un teléfono.
 */
export function useAutoFocus(): boolean {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    setOk(window.matchMedia("(pointer: fine)").matches);
  }, []);

  return ok;
}
