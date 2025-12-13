import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
      boxShadow: {
        plush:
          "0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)",
        glass:
          "0 18px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.10), inset 0 0 0 1px rgba(255,255,255,.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
