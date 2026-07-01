/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "yenshia",
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        yenshia: {
          primary: "#2670DC",
          "primary-content": "#FFFFFF",
          secondary: "#FFFFFF",
          "secondary-content": "#2670DC",
          accent: "#155DFC",
          "accent-content": "#FFFFFF",
          neutral: "#002259",
          "neutral-content": "#FFFFFF",
          "base-100": "#FFFFFF",
          "base-200": "#F4F9FF",
          "base-300": "#EFF4F9",
          "base-content": "#002259",
          info: "#2670DC",
          "info-content": "#FFFFFF",
          success: "#0DDE53",
          "success-content": "#002259",
          warning: "#79ADF8",
          "warning-content": "#002259",
          error: "#EF4444",
          "error-content": "#FFFFFF",
          "--rounded-box": "12px",
          "--rounded-btn": "16px",
          "--rounded-badge": "9999px",
          ".tooltip": {
            "--tooltip-tail": "6px",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["Instrument Sans", "InstrumentSans-Regular", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "InstrumentSerif-Regular", "Georgia", "serif"],
        mono: ["Space Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
    },
  },
};
