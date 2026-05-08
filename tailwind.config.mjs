export default {
  content: ["./web/index.html", "./web/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        company: {
          ink: "#071225",
          muted: "#51627f",
          blue: "#2364d2",
          green: "#16845b",
          amber: "#b87700",
          border: "#d8e1ee"
        }
      },
      borderRadius: {
        company: "8px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  }
};
