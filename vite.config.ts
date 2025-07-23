import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      port: 8080,
      host: "localhost",
      // Add WebSocket options for better error handling
      clientErrorOverlay: false, // Disable error overlay for WebSocket issues
    },
    cors: true,
    // Add WebSocket options
    ws: {
      error: (error, request) => {
        // Log WebSocket errors as warnings instead of errors
        console.warn('Vite WebSocket warning:', error.message);
      }
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize deps for better development experience
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  // Improve build performance
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
        },
      },
    },
  },
}));
