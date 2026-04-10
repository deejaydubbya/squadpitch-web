/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // App dark theme backgrounds
        sp: {
          bg: '#0F0C1A',
          surface: '#0F1E22',
          'surface-variant': '#102A2E',
          card: '#0B1413',
          overlay: '#0D1117',
          'solid-card': '#081F20',
        },

        // White scales
        white: {
          DEFAULT: '#FFFFFF',
          100: '#FFFFFF',
          90: 'rgba(255, 255, 255, 0.90)',
          80: 'rgba(255, 255, 255, 0.80)',
          70: 'rgba(255, 255, 255, 0.70)',
          60: 'rgba(255, 255, 255, 0.60)',
          40: 'rgba(255, 255, 255, 0.40)',
          30: 'rgba(255, 255, 255, 0.30)',
          20: 'rgba(255, 255, 255, 0.20)',
          15: 'rgba(255, 255, 255, 0.15)',
          10: 'rgba(255, 255, 255, 0.10)',
          5: 'rgba(255, 255, 255, 0.05)',
        },

        // Brand greens
        green: {
          110: '#042423',
          100: '#1A3331',
          90: '#1A403D',
          80: '#165954',
          70: '#007166',
          60: '#1C8C81',
          50: '#42A69C',
          40: '#60BFB6',
          30: '#82D9D0',
          20: '#AAF2EB',
          10: '#CCFFFA',
        },

        // Accent colors
        accent: {
          green: {
            120: '#11A64F',
            110: '#1DBF60',
            100: '#2BD974',
            50: 'rgba(29, 191, 96, 0.50)',
          },
          red: '#E5484D',
          blue: '#1397EF',
          orange: '#E6872F',
          yellow: {
            100: '#FFB74D',
            80: 'rgba(255, 183, 77, 0.80)',
          },
        },

        // Primary teal
        teal: {
          DEFAULT: '#00C6A7',
          dark: '#00A88E',
          light: 'rgba(0, 198, 167, 0.1)',
          50: 'rgba(0, 198, 167, 0.15)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'display-lg': ['4rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['2.25rem', { lineHeight: '1.25', fontWeight: '600' }],
      },

      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'glow-green': '0 0 20px rgba(29, 191, 96, 0.3)',
        'glow-teal': '0 0 20px rgba(0, 198, 167, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'navbar': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
