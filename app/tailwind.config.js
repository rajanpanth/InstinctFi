/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#edfffe",
          100: "#c4fff8",
          200: "#8afff1",
          300: "#4df5e1",
          400: "#1ae6cc",
          500: "#00d4aa",
          600: "#00ab8a",
          700: "#00876e",
          800: "#006a57",
          900: "#004d40",
        },
        surface: {
          0: "#0a0a0a",
          50: "#111111",
          100: "#161616",
          200: "#1c1c1c",
          300: "#222222",
          400: "#2a2a2a",
          500: "#333333",
        },
        border: {
          DEFAULT: "#222222",
          light: "#2a2a2a",
          hover: "#333333",
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        scaleIn: "scaleIn 0.2s ease-out",
        slideUp: "slideUp 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
