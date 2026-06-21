import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#1a1231',
          cell: '#1e1640',
          border: '#2d2458',
        },
      },
      gridTemplateColumns: {
        '11': 'repeat(11, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        '11': 'repeat(11, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
