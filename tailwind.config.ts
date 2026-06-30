import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "pitahaya-bg": "#0A0612",
        "pitahaya-black": "#0A0612",
        "pitahaya-blackberry": "#1E0324",
        "pitahaya-eggplant": "#39065E",
        "pitahaya-cerise": "#CF3790",
        "pitahaya-tearose": "#F38D62",
        "pitahaya-melanzane": "#130E12",
        "pitahaya-glowEnd": "#B828E8",
        "pitahaya-dark": "#0E0A18",
        "pitahaya-card": "rgba(30, 3, 36, 0.72)",
        "pitahaya-surface": "rgba(19, 14, 18, 0.88)",
        "pitahaya-border": "rgba(57, 6, 94, 0.35)",
        "pitahaya-accent": "#CF3790",
        "pitahaya-accent-light": "#E36AB0",
        "pitahaya-coral": "#F38D62",
        "pitahaya-gray-300": "#D8CFEB",
        "pitahaya-gray-500": "#8B7BA8",
        "pitahaya-green": "#00E5A0",
        "pitahaya-yellow": "#FFB830",
        pitahaya: {
          bg: "#0A0612",
          blackberry: "#1E0324",
          eggplant: "#39065E",
          cerise: "#CF3790",
          tearose: "#F38D62",
          melanzane: "#130E12",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        orbitron: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #CF3790 0%, #B828E8 100%)",
        "gradient-glow": "radial-gradient(circle at 50% -20%, rgba(207, 55, 144, 0.18), transparent 80%)",
        "gradient-panel": "linear-gradient(180deg, rgba(30, 3, 36, 0.86) 0%, rgba(19, 14, 18, 0.92) 100%)",
      },
      boxShadow: {
        glass: "0 12px 40px rgba(19, 14, 18, 0.45)",
        "glow-cerise": "0 0 28px rgba(207, 55, 144, 0.28)",
        "glow-tearose": "0 0 28px rgba(243, 141, 98, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;