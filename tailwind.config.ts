import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panel2: "rgb(var(--panel2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accent2: "rgb(var(--accent2) / <alpha-value>)",
        accent3: "rgb(var(--accent3) / <alpha-value>)",
      },
      boxShadow: {
        plush: "var(--shadow-plush)",
        glass: "var(--shadow-glass)",
        inset: "var(--shadow-inset)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.05)",
      },
      transitionDuration: {
        350: "350ms",
      },
      keyframes: {
        checkPop: {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "55%": { transform: "scale(1.18) rotate(-6deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        rippleSuccess: {
          "0%": { transform: "translate(-50%,-50%) scale(0)", opacity: "0.55" },
          "70%": { transform: "translate(-50%,-50%) scale(1)", opacity: "0.22" },
          "100%": { transform: "translate(-50%,-50%) scale(1.15)", opacity: "0" },
        },
      },
      animation: {
        checkPop: "checkPop 320ms cubic-bezier(0.68,-0.55,0.265,1.55) 140ms both",
        rippleSuccess: "rippleSuccess 650ms ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
