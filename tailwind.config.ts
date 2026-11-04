import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FBFBFA",
        surface: "#FFFFFF",
        subtle: "#F7F6F3",
        charcoal: "#111111",
        graphite: "#2F3437",
        "muted-gray": "#787774",
        "border-light": "#EAEAEA",
        pastel: {
          green: "#EDF3EC",
          "green-text": "#346538",
          blue: "#E1F3FE",
          "blue-text": "#1F6C9F",
          red: "#FDEBEC",
          "red-text": "#9F2F2D",
          yellow: "#FBF3DB",
          "yellow-text": "#956400",
        },
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Newsreader", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "Geist Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
      },
    },
  },
  plugins: [],
} satisfies Config;
