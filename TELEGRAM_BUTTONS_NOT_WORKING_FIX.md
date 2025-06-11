# Telegram Buttons Not Working - Troubleshooting Guide

## Problem Description

User reported: "دکمه ها در تلگرام کار نمیکنند" (Buttons in Telegram are not working)

## Root Cause Analysis

After investigation, the issue was found in the `callback-session-fix.ts` file where:

1. **Missing Registration**: The `registerSecureCallback` function was creating a secure callback wrapper but never actually registering it with the Telegram callback service
2. **Service Reference Error**: The unregister function was calling `optimizedTelegramCallbackService` instead of `enhancedTelegramCallbackService`
3. **Incomplete Callback Chain**: The callback wrapper was created but not passed to the actual polling service

## Fix Applied

### Updated `src/lib/callback-session-fix.ts`

**Before (Broken)**:

```typescript
// Register with the enhanced telegram service
enhancedTelegramCallbackService.unregisterHandler(sessionId); // Only unregistered, never registered!
```

**After (Fixed)**:

```typescript
// First unregister any existing handler for this session
enhancedTelegramCallbackService.unregisterHandler(sessionId);

// Now register the new secure callback handler
enhancedTelegramCallbackService.registerHandler(sessionId, secureCallback);

console.log(
  "✅ Secure callback registered successfully for session:",
  sessionId,
);
```

### Fixed Unregister Function

**Before (Broken)**:

```typescript
export const unregisterSecureCallback = (sessionId: string): void => {
  console.log("🗑️ Unregistering secure callback:", sessionId);
  activeBrowserSessions.delete(sessionId);
  optimizedTelegramCallbackService.unregisterHandler(sessionId); // Wrong service!
};
```

**After (Fixed)**:

```typescript
export const unregisterSecureCallback = (sessionId: string): void => {
  console.log("🗑️ Unregistering secure callback:", sessionId);
  activeBrowserSessions.delete(sessionId);
  enhancedTelegramCallbackService.unregisterHandler(sessionId); // Correct service
};
```

## How Telegram Buttons Work

1. **Button Creation**: When user reaches loading page, `showAdminButtons()` is called
2. **Message Update**: Telegram message is updated with inline keyboard buttons
3. **Callback Registration**: `registerSecureCallback()` registers a handler to listen for button clicks
4. **Polling Service**: Enhanced Telegram service polls for button clicks every 3 seconds
5. **Click Processing**: When admin clicks a button, callback is triggered and user is redirected

## Button Flow

```
User opens app → Phone verification → Loading page → showAdminButtons() →
Telegram message updated with buttons → Admin clicks button →
Polling service receives callback → Secure callback handler validates session →
User redirected to appropriate auth page
```

## Testing the Fix

1. **Open the app and complete phone verification**
2. **Check NetworkDebugInfo** (top-right corner in development) should show:
   - "Polling Active" status
   - Green indicator
   - Handler count > 0
3. **Check Telegram** for message with buttons
4. **Click any button** - user should be redirected immediately
5. **Console logs** should show callback processing

## Debug Information Available

- **NetworkDebugInfo Component**: Real-time status in top-right corner
- **Console logs**: Detailed callback registration and processing logs
- **Session validation**: Ensures callbacks only affect correct user

## Verification Commands

In browser console:

```javascript
// Check if callback is registered
getTelegramCallbackDebugInfo();

// Check session info
getSessionDebugInfo();
```

## Common Issues to Check

1. **Environment Variables**: Ensure `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_CHAT_ID` are set
2. **Network Status**: Check if "Network: online" in debug info
3. **Polling Status**: Should show "Polling Active" with green indicator
4. **Handler Count**: Should be > 0 when on loading page
5. **Session Matching**: Callback should only affect the correct user

## What Was Fixed

✅ **Callback Registration**: Now properly registers the secure callback with the polling service
✅ **Service Consistency**: Uses `enhancedTelegramCallbackService` throughout
✅ **Session Validation**: Maintains secure session isolation between users
✅ **Error Handling**: Proper cleanup and unregistration

The Telegram buttons should now work correctly for all users.
