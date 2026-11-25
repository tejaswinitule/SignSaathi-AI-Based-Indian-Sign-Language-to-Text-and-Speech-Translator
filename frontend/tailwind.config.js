/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { brand: { 50:'#f5f0ff',100:'#e9ddff',200:'#d2bdff',500:'#8057c9',600:'#6d45b5',700:'#593697',900:'#35205d' } }, boxShadow: { soft:'0 12px 35px rgba(49,30,87,.08)' } } },
  plugins: []
}