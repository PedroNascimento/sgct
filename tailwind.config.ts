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
        brand: {
          50: "#e9f7fc",
          100: "#d5f1f7",
          200: "#b0eefc",
          300: "#7de3f4",
          400: "#49cce6",
          500: "#007da5",
          600: "#006184",
          700: "#005175",
          800: "#003f5c",
          900: "#003057",
        },
        success: {
          50: "#eef7ed",
          200: "#a8d5a2",
          700: "#206b3f",
        },
        warning: {
          50: "#fff7e6",
          200: "#f4c46b",
          700: "#8f4200",
        },
        danger: {
          50: "#fdedec",
          200: "#e8a09e",
          700: "#b00504",
        },
      },
      fontFamily: {
        sans: [
          "Source Sans 3",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 8px rgb(13 15 16 / 0.08)",
        elevated: "0 12px 32px rgb(13 15 16 / 0.12)",
      },
      maxWidth: {
        content: "75rem",
      },
    },
  },
  plugins: [],
};

export default config;
