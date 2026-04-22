import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Palette Claude/Cowork - inspirée de Anthropic
        cream: {
          50: "#FAF9F5",
          100: "#F5F4EE",
          200: "#F0EEE6", // fond principal clair
          300: "#E8E5D8",
          400: "#D9D4C2",
        },
        ink: {
          50: "#F5F4EE",
          100: "#E8E5D8",
          200: "#A8A297",
          300: "#6B6558",
          400: "#3D3929",
          500: "#2C2A21",
          600: "#1F1D17",
          700: "#15140F", // fond sombre
          800: "#0F0E0A",
          900: "#08070500",
        },
        terracotta: {
          50: "#FDF4EF",
          100: "#F9E2D3",
          200: "#F1C0A3",
          300: "#E59B74",
          400: "#D77F52",
          500: "#CC785C", // orange signature
          600: "#B15D3F",
          700: "#8C4830",
          800: "#6B3724",
          900: "#4A2619",
        },
      },
      fontFamily: {
        serif: [
          "Tiempos Text",
          "Source Serif Pro",
          "Georgia",
          "ui-serif",
          "serif",
        ],
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
