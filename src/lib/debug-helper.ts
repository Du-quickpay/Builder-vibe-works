/**
 * Debug Helper for Telegram Bot integration
 *
 * This helper provides utilities to test and debug the Telegram bot integration
 * without requiring actual Telegram interaction
 */

import { validateTelegramConfig } from "./telegram-service-enhanced";

/**
 * Test Telegram API configuration
 */
export const testTelegramConfig = async (): Promise<{
  success: boolean;
  botInfo?: any;
  error?: string;
}> => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  if (!token || token === "YOUR_BOT_TOKEN") {
    return {
      success: false,
      error: "Telegram bot token not configured",
    };
  }

  if (!chatId || chatId === "YOUR_CHAT_ID") {
    return {
      success: false,
      error: "Telegram chat ID not configured",
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Telegram API error: ${response.status} - ${errorText}`,
      };
    }

    const botInfo = await response.json();
    return { success: true, botInfo };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Send a test message to Telegram
 */
export const sendTestMessageToTelegram = async (
  message: string = "Test message from authentication system",
): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
}> => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  if (!validateTelegramConfig()) {
    return {
      success: false,
      error: "Telegram configuration not valid",
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Telegram API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.result.message_id,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Create a debug page
 */
export const createDebugInfo = () => {
  return {
    telegramToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN
      ? import.meta.env.VITE_TELEGRAM_BOT_TOKEN.substring(0, 5) + "..."
      : "Not configured",
    telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || "Not configured",
    isConfigValid: validateTelegramConfig(),
    environment: import.meta.env.MODE || "development",
    timestamp: new Date().toISOString(),
  };
};
