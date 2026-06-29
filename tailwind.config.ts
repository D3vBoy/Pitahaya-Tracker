import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitahaya: {
          // Fondos y Superficies
          "light-bg": "#FFF0F5",   // Fondo principal claro (Lavender Blush)
          "light-card": "#FFFFFF", // Tarjetas claras
          black: "#0F0A1A",        // Fondo principal oscuro (Deep Void)
          dark: "#1E0324",         // Superficies oscuras (Blackberry)
          
          // Acentos Vibrantes
          accent: "#CF3790",       // Acción Principal (Deep Cerise)
          "accent-light": "#39065E", // Hover y Bordes (Eggplant)
          coral: "#F38D62",        // Acento Cálido (Tea Rose)

          // Textos Específicos por Modo
          "dark-text": "#1E0324",    // Texto principal en modo claro
          "secondary-text": "#4A0E5C", // Texto secundario en modo claro
          
          // Escala de Grises Auxiliar (para textos muy secundarios)
          gray: {
            100: "#F2F0FA",
            300: "#B0A0C8",
            500: "#6B5B8A",
            700: "#3A2A5A",
            900: "#1A1030",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;