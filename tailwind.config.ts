import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cad: {
          bg:             "#06080c",
          primary:        "#0a0e15",
          panel:          "#0f1420",
          surface:        "#151c2b",
          input:          "#1a2332",
          "input-focus":  "#1e293b",
          border:         "#1e293b",
          "border-hover": "#334155",
          "border-active":"#4f5f7a",
          accent:         "#6366f1",
          "accent-hover": "#818cf8",
          "accent-glow":  "#6366f140",
          "accent-muted": "#6366f120",
          secondary:      "#8b5cf6",
          success:        "#10b981",
          "success-muted":"#10b98120",
          error:          "#ef4444",
          "error-muted":  "#ef444420",
          warning:        "#f59e0b",
          "warning-muted":"#f59e0b20",
          text:           "#f1f5f9",
          "text-secondary":"#94a3b8",
          "text-muted":   "#64748b",
          "text-dim":     "#475569",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "xs":  ["0.75rem",  { lineHeight: "1rem" }],
        "sm":  ["0.8125rem",{ lineHeight: "1.25rem" }],
        "base":["0.875rem", { lineHeight: "1.375rem" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
      },
      borderRadius: {
        "xs": "0.1875rem",
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
      },
      boxShadow: {
        "glow-sm": "0 0 8px 0 rgba(99, 102, 241, 0.15)",
        "glow-md": "0 0 16px 0 rgba(99, 102, 241, 0.2)",
        "glow-lg": "0 0 32px 0 rgba(99, 102, 241, 0.25)",
        "elevation-1": "0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)",
        "elevation-2": "0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4)",
        "elevation-3": "0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.4)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.03)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 200ms ease-out",
        "slide-down": "slideDown 200ms ease-out",
        "scale-in": "scaleIn 150ms ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glowPulse 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn:   { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:  { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown:{ from: { opacity: "0", transform: "translateY(-4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn:  { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        glowPulse:{ "0%,100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        shimmer:  { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
