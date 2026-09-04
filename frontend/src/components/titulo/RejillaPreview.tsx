import { Icon } from "@/components/portal/Icon";

/**
 * Las casillas del papel, en vivo.
 *
 * El FORMATO escribe el carné, los nombres y los apellidos LETRA POR LETRA, una por casilla, y no
 * tiene ni una de más: 13 para el carné y 37 para cada mitad del nombre. Un contador ("28 de 37")
 * diría lo mismo en teoría, pero nadie sabe cuánto es 37 hasta que lo ve; aquí se ven las casillas
 * reales llenándose mientras se escribe, así que el alumno entiende el límite antes de chocarse con
 * él y —lo que más importa— ve el nombre tal como va a quedar impreso.
 *
 * Lo que se pasa del tope se pinta en rojo en vez de desaparecer: si sobra una letra tiene que
 * notarse aquí, no al recoger el título.
 */
export function RejillaPreview({
  value,
  casillas,
  label,
}: {
  value: string;
  casillas: number;
  label: string;
}) {
  const chars = [...value];
  const sobra = Math.max(0, chars.length - casillas);
  const visibles = chars.slice(0, casillas);
  const excedente = chars.slice(casillas);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">{label}</span>
        <span
          className={`tabular text-[11.5px] font-semibold transition-colors duration-300 ease-crisp ${
            sobra > 0 ? "text-isel-alert" : chars.length > 0 ? "text-isel-emerald2" : "text-isel-ink/35"
          }`}
        >
          {chars.length} de {casillas}
          {sobra > 0 && ` · sobran ${sobra}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-[3px]">
        {Array.from({ length: casillas }, (_, i) => {
          const ch = visibles[i];
          return (
            <span
              key={i}
              className={`flex h-7 w-[19px] items-center justify-center rounded-[3px] border text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-300 ease-back ${
                ch
                  ? "-translate-y-px border-isel-navy/45 bg-white text-isel-navy shadow-[0_1px_2px_rgba(12,51,42,0.08)]"
                  : "border-isel-line bg-isel-paper/60 text-transparent"
              }`}
            >
              {ch === " " ? "" : (ch ?? "")}
            </span>
          );
        })}
        {/* Las que no caben: mismas casillas, en rojo, para que el exceso se vea. */}
        {excedente.map((ch, i) => (
          <span
            key={`x${i}`}
            className="flex h-7 w-[19px] items-center justify-center rounded-[3px] border border-isel-alert/60 bg-isel-alert/10 text-[13px] font-semibold text-isel-alert"
          >
            {ch === " " ? "" : ch}
          </span>
        ))}
      </div>

      {sobra > 0 && (
        <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-isel-alert">
          <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
          No cabe en la ficha: reduzca {sobra} {sobra === 1 ? "carácter" : "caracteres"} o registre únicamente los
          nombres con los que aparecerá en el título.
        </p>
      )}
    </div>
  );
}
