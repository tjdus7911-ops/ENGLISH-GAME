/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#E9513B', dark: '#B3361F', soft: '#FDECE8' },
        ink: { DEFAULT: '#1F2328', soft: '#57606A', faint: '#8C959F' },
        line: '#E6E8EB',
        mist: '#F5F6F8',
        mint: '#DDF3EA', sky: '#DDEBFA', butter: '#FFF4CC', lilac: '#ECE4FA', peach: '#FFE6D8',
        ok: '#1F8A5B', bad: '#C2412D',
      },
      fontFamily: {
        sans: ['Pretendard', 'Pretendard Variable', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
};
