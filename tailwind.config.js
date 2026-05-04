/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary: Đỏ VietTune (Vibrant Red)
        primary: {
          50: "#fef2f2",
          100: "#fde8e8",
          200: "#fbd5d5",
          300: "#f8b4b4",
          400: "#f17070",
          500: "#da251d",
          600: "#be1e16",
          700: "#a11912",
          800: "#84140e",
          900: "#69100b",
        },
        // Secondary: Vàng cờ Việt Nam (Vietnamese Flag Yellow/Gold)
        secondary: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Neutral colors for text and backgrounds
        neutral: {
          50: "#FFF2D6",
          100: "#FFECC4",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        // Cream background
        cream: {
          50: "#FFF7E6",
          100: "#FFF2D6",
          200: "#FFECC4",
        },
        /** Panel/card cream — use `bg-surface-panel`, `from-surface-panel`, etc. */
        surface: {
          panel: "#FFFCF5",
        },
      },
      keyframes: {
        "noti-fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "noti-fade-in": "noti-fade-in 0.35s ease-out forwards",
      },
    },
  },
  plugins: [],
};