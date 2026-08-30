/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * ISEL 2.0 — la raíz institucional sigue siendo verde (UMES), pero
         * el verde ya no carga la página solo: cada maestría tiene su propio
         * acento (ver src/data/accents.ts) y el ámbar salesiano se reserva
         * para señales, no para rellenar.
         *
         * Los nombres de token se conservan (isel-navy / gold / paper / ...)
         * porque el portal los usa en ~240 lugares; solo cambian los valores,
         * así que portal y sitio público quedan en la misma paleta.
         */
        isel: {
          navy: "#0A2B24", // verde pino profundo — superficies oscuras
          navy2: "#11463A", // verde elevado — hover / capas
          deep: "#061a16", // casi negro verdoso — fondo de hero
          emerald: "#12855C", // verde vivo — acción primaria
          emerald2: "#0D6B49", // verde vivo hover
          gold: "#E8B33D", // ámbar salesiano — señales y subrayados
          gold2: "#A97B18", // ámbar legible sobre claro
          ink: "#12211D", // texto sobre claro
          paper: "#F6F3EC", // hueso cálido — fondo de página
          arena: "#EFE7D6", // arena cálida — bandas alternas
          mist: "#EAEFE9", // verde muy lavado — bandas alternas
          line: "#E1DBCD", // hairlines sobre claro
          /* Señales del portal. Antes venían de la rampa por defecto de
             Tailwind (sky-100, purple-700, red-600…), que no pertenece a
             ninguna paleta de la marca y hacía que el portal pareciera
             otro producto. Estos cuatro sí son ISEL. */
          sky: "#2C6E8F", // azul acero — "Link de pago"
          plum: "#6D5AA8", // morado apagado — "Presencial"
          alert: "#B23A2B", // rojo tierra — destructivo / error
          alert2: "#8E2A1E", // el mismo, para hover
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["'Instrument Serif'", "ui-serif", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.045em",
        ultratight: "-0.06em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,43,36,0.05), 0 10px 30px -12px rgba(10,43,36,0.22)",
        "card-hover": "0 2px 6px rgba(10,43,36,0.08), 0 28px 56px -18px rgba(10,43,36,0.42)",
        lift: "0 24px 60px -24px rgba(10,43,36,0.55)",
        /* Halo del color del programa — se enciende al enfocar una tarjeta. */
        accent: "0 30px 70px -28px var(--accent), 0 0 0 1px var(--accent)",
      },
      transitionTimingFunction: {
        // Curvas propias: nada de `ease`/`ease-in-out` por defecto en la página.
        snap: "cubic-bezier(0.16, 1, 0.3, 1)", // salida suave, cola larga
        entry: "cubic-bezier(0.32, 0.72, 0, 1)", // entradas decididas
        crisp: "cubic-bezier(0.4, 0, 0.2, 1)",
        back: "cubic-bezier(0.34, 1.56, 0.64, 1)", // overshoot corto
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%, -6%, 0) scale(1.08)" },
        },
        drift2: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1.05)" },
          "50%": { transform: "translate3d(-5%, 5%, 0) scale(0.95)" },
        },
        marquee: {
          from: { transform: "translate3d(0,0,0)" },
          to: { transform: "translate3d(-50%,0,0)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        /* Barra indeterminada de carga del portal: recorre su carril en vez de
           girar. Un spinner circular es el gesto por defecto de cualquier
           plantilla; una barra que barre dice "estamos leyendo una lista". */
        sweep: {
          "0%": { transform: "translate3d(-100%,0,0)" },
          "100%": { transform: "translate3d(300%,0,0)" },
        },
      },
      animation: {
        drift: "drift 22s cubic-bezier(0.45,0,0.55,1) infinite",
        drift2: "drift2 28s cubic-bezier(0.45,0,0.55,1) infinite",
        marquee: "marquee 38s linear infinite",
        "spin-slow": "spin-slow 44s linear infinite",
        breathe: "breathe 4.5s cubic-bezier(0.45,0,0.55,1) infinite",
        sweep: "sweep 1.15s cubic-bezier(0.65,0,0.35,1) infinite",
      },
    },
  },
  plugins: [],
};
