/** Couleurs pilotées par des variables CSS (voir src/index.css) : les modes clair et sombre ne changent que les variables. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), fg: v("fg"), muted: v("muted"),
        accent: v("accent"), "accent-fg": v("accent-fg"), rose: v("rose"), soft: v("soft"),
        plum: v("plum"), "plum-2": v("plum-2"), "plum-fg": v("plum-fg"), "plum-muted": v("plum-muted"),
        line: "rgb(var(--fg) / 0.12)", "line-strong": "rgb(var(--fg) / 0.28)",
        glass: "rgb(var(--bg) / 0.85)",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Cormorant", "Garamond", '"Times New Roman"', "serif"],
        sans: ["Jost", "Futura", '"Avenir Next"', '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      transitionTimingFunction: { lux: "cubic-bezier(.22,.61,.36,1)" },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        drift: { from: { transform: "scale(1)" }, to: { transform: "scale(1.06)" } },
        fadein: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        rise: "rise .7s cubic-bezier(.22,.61,.36,1) both",
        drift: "drift 14s ease-in-out infinite alternate",
        fadein: "fadein .6s cubic-bezier(.22,.61,.36,1)",
      },
    },
  },
  plugins: [],
};
