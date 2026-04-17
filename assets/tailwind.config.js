/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 28px rgb(31 188 160 / 0.32)",
        amberGlow: "0 0 28px rgb(245 158 11 / 0.28)",
      },
    },
  },
  plugins: [],
};
