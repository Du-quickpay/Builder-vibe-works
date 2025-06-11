// Environment Debug Component
// Shows current environment variable status

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EnvDebug: React.FC = () => {
  const envVars = {
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    VITE_TELEGRAM_BOT_TOKEN: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
    VITE_TELEGRAM_CHAT_ID: import.meta.env.VITE_TELEGRAM_CHAT_ID,
  };

  const getBadgeVariant = (value: string | undefined) => {
    if (!value || value === "YOUR_BOT_TOKEN" || value === "YOUR_CHAT_ID") {
      return "destructive";
    }
    return "default";
  };

  const formatValue = (key: string, value: string | undefined) => {
    if (!value) return "❌ Not set";
    if (key.includes("TOKEN") || key.includes("CHAT_ID")) {
      if (value === "YOUR_BOT_TOKEN" || value === "YOUR_CHAT_ID") {
        return "❌ Default placeholder";
      }
      // Show only first and last 4 characters for security
      if (value.length > 8) {
        return `✅ ${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
      }
      return `✅ ${value}`;
    }
    return value;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🔧 Environment Variables</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="font-mono text-sm">{key}:</span>
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(value)}>
                  {formatValue(key, value)}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <h4 className="font-semibold mb-2">Environment Setup</h4>
          <ul className="space-y-1">
            <li>
              • Create <code>.env</code> file in project root
            </li>
            <li>
              • Copy from <code>.env.example</code>
            </li>
            <li>• Get bot token from @BotFather on Telegram</li>
            <li>• Get chat ID from @userinfobot on Telegram</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnvDebug;
