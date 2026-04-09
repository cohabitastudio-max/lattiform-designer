import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cad-primary": "#0b0f14",
        "cad-panel": "#111827",
        "cad-input": "#1e293b",
        "cad-border": "#1e293b",
        "cad-border-hover": "#334155",
        "cad-accent": "#6366f1",
        "cad-accent-hover": "#818cf8",
        "cad-success": "#10b981",
        "cad-error": "#ef4444",
        "cad-text": "#f1f5f9",
        "cad-text-secondary": "#94a3b8",
        "cad-text-muted": "#64748b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
