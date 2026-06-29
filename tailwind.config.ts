import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Habilita el uso de dark: en clases
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitahaya: {
          // Fondos y elementos base
          light: {
            bg: "#F8F0FF",      // Lila muy pálido y elegante
            card: "#FFFFFF",     // Blanco para tarjetas
            text: "#1A1030",     // Texto principal oscuro (Midnight Berry)
            secondary: "#4A3A6A", // Texto secundario
          },
          // Oscuros profundos
          black: "#0F0A1A",
          dark: "#1A1030",
          // Acentos vibrantes (funcionan en ambos modos)
          accent: "#FF2D78",     // Electric Magenta (acción principal)
          "accent-light": "#B828E8", // Neon Purple (hover, bordes)
          yellow: "#FFB830",     // Solar Flare (advertencia/media)
          green: "#00E5A0",      // Neon Mint (éxito/alta probabilidad)
          coral: "#FF4560",      // Wild Watermelon (eliminar/peligro)
          // Escala de grises (adaptada a la paleta)
          gray: {
            100: "#F2F0FA",
            300: "#B0A0C8",
            500: "#6B5B8A",
            700: "#3A2A5A",
            900: "#1A1030",
          },
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.05)",
        neumorph: "8px 8px 16px #EAE0F5, -8px -8px 16px #FFFFFF",
        "neumorph-inset": "inset 4px 4px 8px #EAE0F5, inset -4px -4px 8px #FFFFFF",
        glow: "0 0 12px rgba(255, 45, 120, 0.4)",
        "glow-strong": "0 0 20px rgba(255, 45, 120, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;