import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#111111",
          muted: "#6B6B6B",
          faint: "#9CA3AF",
        },
        line: {
          DEFAULT: "#E5E5E5",
          strong: "#D4D4D4",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#FAFAFA",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Segoe UI", "Calibri", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
