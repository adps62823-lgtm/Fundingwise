/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#161616",
        teal: "#0f62fe",
        amber: "#f1c21b",
        ink: "#161616",
        mist: "#525252",
        panel: "#ffffff",
      },
      boxShadow: {
        soft: "none",
      },
      borderRadius: {
        "2xl": "0",
      },
    },
  },
  plugins: [],
};
