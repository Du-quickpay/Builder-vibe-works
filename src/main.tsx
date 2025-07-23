import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle WebSocket errors from Vite HMR in development
if (import.meta.env.DEV) {
  // Override console.error to filter out Vite WebSocket errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';

    // Filter out common Vite WebSocket errors that don't affect functionality
    if (
      message.includes('WebSocket closed without opened') ||
      message.includes('WebSocket connection to') ||
      message.includes('[vite] connecting...') ||
      message.includes('[vite] disconnected')
    ) {
      // Log as warning instead of error for development WebSocket issues
      console.warn('🔄 Vite HMR WebSocket issue (non-critical):', ...args);
      return;
    }

    // Call original console.error for other errors
    originalConsoleError.apply(console, args);
  };

  // Add global error handler for WebSocket-related unhandled rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';

    if (
      reason.includes('WebSocket closed without opened') ||
      reason.includes('WebSocket connection failed') ||
      reason.includes('vite') ||
      reason.includes('hmr')
    ) {
      console.warn('🔄 Vite HMR WebSocket rejection (non-critical):', event.reason);
      event.preventDefault(); // Prevent the error from showing in console
      return;
    }
  });

  // Handle Vite-specific connection issues
  if (typeof window !== 'undefined' && 'WebSocket' in window) {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);

        // Add error handling for Vite WebSocket
        this.addEventListener('error', (event) => {
          if (url.toString().includes('/@vite/client')) {
            console.warn('🔄 Vite HMR WebSocket error (non-critical):', event);
          }
        });

        this.addEventListener('close', (event) => {
          if (url.toString().includes('/@vite/client')) {
            console.warn('🔄 Vite HMR WebSocket closed (non-critical):', event.code, event.reason);
          }
        });
      }
    };
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
