import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import TemplateBuilder from "./pages/TemplateBuilder";
import TemplatesList from "./pages/TemplatesList";
import SubmissionsReview from "./pages/SubmissionsReview";
import Interview from "./pages/Interview";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/templates" element={<ProtectedRoute><TemplatesList /></ProtectedRoute>} />
          <Route path="/admin/templates/:id" element={<ProtectedRoute><TemplateBuilder /></ProtectedRoute>} />
          <Route path="/admin/submissions" element={<ProtectedRoute><SubmissionsReview /></ProtectedRoute>} />
          <Route path="/interview/:templateId" element={<Interview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
