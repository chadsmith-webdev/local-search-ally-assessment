import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "border-accent": "var(--border-accent)",
        background: "var(--bg)",
        foreground: "var(--text)",
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
        },
        carolina: {
          DEFAULT: "var(--carolina)",
          dark: "var(--carolina-dark)",
          dim: "var(--carolina-dim)",
          mid: "var(--carolina-mid)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface2)",
          3: "var(--surface3)",
        },
        slate: "var(--slate)",
        steel: "var(--steel)",
        status: {
          green: "var(--status-green)",
          yellow: "var(--status-yellow)",
          red: "var(--status-red)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Bricolage Grotesque", "sans-serif"],
        sans: ["var(--font-body)", "Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(123, 175, 212, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
