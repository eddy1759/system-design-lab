/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#050d1a",
          surface: "#0a1628",
          elevated: "#0f1f38",
          hover: "#142847",
        },
        accent: {
          cyan: "#00f5ff",
          amber: "#ffb800",
          green: "#00ff88",
          red: "#ff3860",
          purple: "#9d4edd",
        },
      },
      fontFamily: {
        heading: ["Syne", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        dash: "dash 1s linear infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "count-up": "countUp 0.6s ease-out",
        shake: "shake 0.5s ease-in-out",
        "blueprint-reveal":
          "blueprintReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 5px currentColor, 0 0 10px currentColor",
          },
          "50%": { boxShadow: "0 0 15px currentColor, 0 0 30px currentColor" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        dash: {
          to: { strokeDashoffset: "-10" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideRight: {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        blueprintReveal: {
          from: { clipPath: "circle(0% at 50% 50%)" },
          to: { clipPath: "circle(100% at 50% 50%)" },
        },
      },
    },
  },
  plugins: [],
};
