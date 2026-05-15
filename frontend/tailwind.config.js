/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                institutional: {
                    green: "#006431", // Verde UniPutumayo
                    blue: "#003366",  // Azul institucional
                    gold: "#C5A059",  // Dorado decorativo
                    light: "#F4F7F6", // Fondo gris claro
                    dark: "#051F20",  // Verde oscuro institucional
                },
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
