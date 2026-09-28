/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEFE9",
        ink: "#1B2430",
        inkdeep: "#10161F",
        slate: "#5B6472",
        teal: "#2F6F6B",
        amber: "#D98E36",
        coral: "#B4433A",
        line: "#C9CCC3",
      },
      fontFamily: {
        serif: ["Source Serif 4", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
      },
    },
  },
  plugins: [],
};
