import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalPresenceProvider } from "@/components/GlobalPresenceProvider";
import Index from "./pages/Index";
import Debug from "./pages/Debug";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalPresenceProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </GlobalPresenceProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
