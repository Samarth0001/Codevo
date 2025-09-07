import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography'

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#0A0C10",
        "dark-card": "#1C2033",
        "dark-accent": "#1E2235",
        "dark-border": "#2A2F45",
        "blue": {
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8"
        },
        "cyan": {
          500: "#06B6D4"
        },
        "indigo": {
          500: "#6366F1"
        },
        "purple": {
          500: "#8B5CF6"
        }
      },
      borderRadius: {
        xl: "0.75rem"
      },
      animation: {
        "gradient-x": "gradient-x 3s ease infinite",
        "typing": "typing 3.5s steps(40, end)"
      }
    },
  },
  plugins: [
    typography
  ],
};

export default config;
