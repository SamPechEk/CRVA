export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F3ED",
        paper: "#FFFDFA",
        ink: "#302B27",
        terracotta: "#97482F",
        muted: "#70665D",
        sage: "#45634D",
      },
      fontFamily: {
        editorial: ["Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
