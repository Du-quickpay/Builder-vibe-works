/**
 * Cloudflare Worker - Telegram API Proxy
 *
 * This worker acts as a proxy for Telegram Bot API to bypass filtering in Iran
 * Deploy this script to: https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev/
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const url = new URL(request.url);

      // Extract the Telegram API path from the request
      // Expected format: /bot{token}/{method} or /file/bot{token}/{file_path}
      const path = url.pathname;

      if (!path.startsWith("/bot") && !path.startsWith("/file/bot")) {
        return new Response(
          "Invalid request path. Expected format: /bot{token}/{method}",
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "text/plain",
            },
          },
        );
      }

      // Construct the official Telegram API URL
      const telegramApiUrl = `https://api.telegram.org${path}${url.search}`;

      // Log the request for debugging (remove in production)
      console.log("Proxying request to:", telegramApiUrl);
      console.log("Method:", request.method);

      // Create a new request to forward to Telegram API
      const telegramRequest = new Request(telegramApiUrl, {
        method: request.method,
        headers: {
          "Content-Type":
            request.headers.get("Content-Type") || "application/json",
          "User-Agent": "Cloudflare-Worker-Telegram-Proxy/1.0",
        },
        body: request.method !== "GET" ? await request.arrayBuffer() : null,
      });

      // Forward the request to Telegram API
      const response = await fetch(telegramRequest);

      // Get response data
      const responseData = await response.arrayBuffer();

      // Log response status for debugging
      console.log("Telegram API response status:", response.status);

      // Create response with CORS headers
      return new Response(responseData, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type":
            response.headers.get("Content-Type") || "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error) {
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 500,
          description: "Internal Worker Error: " + error.message,
        }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
