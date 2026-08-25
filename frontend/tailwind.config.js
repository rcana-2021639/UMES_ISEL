/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ISEL brand palette — solid colors only, no gradients anywhere.
        isel: {
          navy: "#0B2545",     // primary institutional blue (headers, nav, dark sections)
          navy2: "#123B6D",    // secondary blue (hover / raised surfaces)
          gold: "#D4A62A",     // Salesian accent gold (CTAs, highlights, underlines)
          gold2: "#B98A17",    // gold hover/active
          ink: "#0F172A",      // body text on light backgrounds
          paper: "#F7F7F5",    // warm off-white page background
          line: "#E4E1D8",     // hairline borders on light sections
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "ui-serif", "Georgia", "serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px -8px rgba(15,23,42,0.18)",
        "card-hover": "0 2px 4px rgba(15,23,42,0.08), 0 20px 40px -12px rgba(11,37,69,0.35)",
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
