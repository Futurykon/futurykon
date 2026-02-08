import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AskQuestion from "./pages/AskQuestion";
import Suggest from "./pages/Suggest";
import Questions from "./pages/Questions";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import MyPredictions from "./pages/MyPredictions";
import EditProfile from "./pages/EditProfile";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ask" element={
              <ProtectedRoute>
                <AskQuestion />
              </ProtectedRoute>
            } />
            <Route path="/suggest" element={
              <ProtectedRoute>
                <Suggest />
              </ProtectedRoute>
            } />
            <Route path="/questions" element={<Questions />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/my-predictions" element={
              <ProtectedRoute>
                <MyPredictions />
              </ProtectedRoute>
            } />
            <Route path="/edit-profile" element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
