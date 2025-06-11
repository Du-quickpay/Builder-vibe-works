// سیستم کنترل ادمین برای نمایش وضعیت حضور
// Admin Control System for Presence Status Display

// شناسه چت ادمین (از متغیر محیطی)
const ADMIN_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

// شناسه‌های ادمین مجاز (می‌توانید چندین ادمین داشته باشید)
const AUTHORIZED_ADMIN_IDS = [
  ADMIN_CHAT_ID,
  // اینجا می‌توانید شناسه‌های ادمین‌های بیشتری اضافه کنید
];

/**
 * بررسی اینکه آیا شناسه داده شده متعلق به ادمین است یا نه
 */
export const isAdmin = (chatId: string | number): boolean => {
  const chatIdStr = chatId.toString();

  // بررسی در لیست ادمین‌های مجاز
  const isAuthorized = AUTHORIZED_ADMIN_IDS.includes(chatIdStr);

  if (isAuthorized) {
    console.log("✅ [ADMIN CHECK] کاربر ادمین تأیید شد:", chatIdStr);
  } else {
    console.log("❌ [ADMIN CHECK] کاربر غیر ادمین:", chatIdStr);
  }

  return isAuthorized;
};

/**
 * بررسی اینکه آیا باید وضعیت حضور و تایپ نمایش داده شود یا نه
 * فقط برای ادمین‌های مجاز
 */
export const shouldShowPresenceStatus = (chatId?: string | number): boolean => {
  if (!chatId) {
    console.log("⚠️ [PRESENCE CHECK] شناسه چت ارائه نشده");
    return false;
  }

  return isAdmin(chatId);
};

/**
 * ایجاد پیام وضعیت حضور برای ادمین
 */
export const createPresenceStatusMessage = (
  statusText: string,
  statusEmoji: string,
  isTyping?: boolean,
  typingField?: string,
  sessionId?: string,
): string => {
  let message = `${statusEmoji} ${statusText}`;

  if (isTyping && typingField) {
    message += `\n⌨️ در حال تایپ در: ${typingField}`;
  }

  if (sessionId) {
    message += `\n🔗 Session: ${sessionId.slice(-8)}`;
  }

  return message;
};

/**
 * بررسی تنظیمات تلگرام و دسترسی ادمین
 */
export const validateAdminAccess = (): {
  hasAccess: boolean;
  reason?: string;
} => {
  // بررسی تنظیمات تلگرام
  const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || BOT_TOKEN === "YOUR_BOT_TOKEN") {
    return {
      hasAccess: false,
      reason: "توکن ربات تلگرام تنظیم نشده",
    };
  }

  if (!CHAT_ID || CHAT_ID === "YOUR_CHAT_ID") {
    return {
      hasAccess: false,
      reason: "شناسه چت ادمین تنظیم نشده",
    };
  }

  return { hasAccess: true };
};

/**
 * دریافت تنظیمات ادمین
 */
export const getAdminConfig = () => {
  return {
    adminChatId: ADMIN_CHAT_ID,
    authorizedAdmins: AUTHORIZED_ADMIN_IDS,
    showPresenceUpdates: true, // فعال‌سازی نمایش وضعیت حضور
    showTypingUpdates: true, // فعال‌سازی نمایش تایپ
    presenceUpdateInterval: 30000, // هر 30 ثانیه
    typingUpdateInterval: 2000, // هر 2 ثانیه
  };
};

export default {
  isAdmin,
  shouldShowPresenceStatus,
  createPresenceStatusMessage,
  validateAdminAccess,
  getAdminConfig,
};
