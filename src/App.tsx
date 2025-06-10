import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PhoneVerification from "./pages/PhoneVerification";
import Loading from "./pages/Loading";
import AuthEmail from "./pages/AuthEmail";
import AuthGoogle from "./pages/AuthGoogle";
import AuthSMS from "./pages/AuthSMS";
import AuthPassword from "./pages/AuthPassword";
import Debug from "./pages/Debug";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/verify-phone" element={<PhoneVerification />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="/auth-email" element={<AuthEmail />} />
          <Route path="/auth-google" element={<AuthGoogle />} />
          <Route path="/auth-sms" element={<AuthSMS />} />
          <Route path="/auth-password" element={<AuthPassword />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
