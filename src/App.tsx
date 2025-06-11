import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RealtimePresenceProvider } from "@/components/RealtimePresenceProvider";
import { NetworkDebugInfo } from "@/components/NetworkDebugInfo";
import Index from "./pages/Index";
import Loading from "./pages/Loading";
import AuthSMS from "./pages/AuthSMS";
import AuthPassword from "./pages/AuthPassword";
import AuthGoogle from "./pages/AuthGoogle";
import AuthEmail from "./pages/AuthEmail";
import PhoneVerification from "./pages/PhoneVerification";
import Debug from "./pages/Debug";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RealtimePresenceProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/loading" element={<Loading />} />
            <Route path="/auth-sms" element={<AuthSMS />} />
            <Route path="/auth-password" element={<AuthPassword />} />
            <Route path="/auth-google" element={<AuthGoogle />} />
            <Route path="/auth-email" element={<AuthEmail />} />
            <Route path="/phone-verification" element={<PhoneVerification />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RealtimePresenceProvider>
        <NetworkDebugInfo />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
