import type { Config } from "tailwindcss";

/**
 * Oficina de topografía — configuración de Tailwind.
 * Se usa la base de shadcn/ui y se reemplazan los tokens.
 * Requiere tokens/tokens.css importado en app/globals.css.
 */
const config: Config = {
  darkMode: [],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          mute: "var(--ink-mute)",
        },
        rule: "var(--rule)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#FFFFFF",
        },
        // señal — solo estado
        pagado: "var(--pagado)",
        pendiente: "var(--pendiente)",
        vencido: "var(--vencido)",

        // remapeo de shadcn/ui
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border: "var(--rule)",
        input: "var(--rule)",
        ring: "var(--accent)",
      },

      fontFamily: {
        // rotulación del cajetín — usar con font-variation-settings wdth 125
        rotulo: ["Archivo", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter Tight", "ui-sans-serif", "system-ui", "sans-serif"],
        dato: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // escala cerrada: 11 / 12 / 14 / 16 / 20 / 26. No hay hero.
      fontSize: {
        "2xs": ["9px", { lineHeight: "1.2", letterSpacing: "0.1em" }],
        xs: ["11px", { lineHeight: "1.3" }],
        sm: ["12px", { lineHeight: "1.35" }],
        base: ["14px", { lineHeight: "1.45" }],
        md: ["16px", { lineHeight: "1.4" }],
        lg: ["20px", { lineHeight: "1.25" }],
        xl: ["26px", { lineHeight: "1.2" }],
      },

      // radio de 3 px en todo. Sin píldoras.
      borderRadius: {
        none: "0",
        DEFAULT: "3px",
        sm: "3px",
        md: "3px",
        lg: "3px",
        full: "9999px", // reservado para el punto de señal de 6 px
      },

      borderWidth: { DEFAULT: "1px", 1: "1px", 2: "2px", 3: "3px" },

      spacing: {
        row: "34px",       // alto de fila de tabla
        control: "32px",   // botones e inputs
        "control-sm": "26px",
      },

      // sin sombras: la separación es el borde.
      // única excepción: lo que flota de verdad.
      boxShadow: {
        none: "none",
        float: "2px 2px 0 rgba(23,33,29,0.18)",
      },

      transitionDuration: { DEFAULT: "120ms", 120: "120ms" },

      // sin animaciones de entrada, sin skeletons que pulsan.
      keyframes: {},
      animation: {},

      backgroundImage: {}, // sin gradientes, en ningún lado
    },
  },
  plugins: [],
};

export default config;
