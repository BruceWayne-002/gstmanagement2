import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import FileReturnsPage from "./components/FileReturnsPage";
import Gstr1PrepareOnlinePage from "@/components/Gstr1PrepareOnlinePage";
import B2BPage from "@/components/B2BPage";
import AddB2BRecordPage from "@/components/AddB2BRecordPage";
import B2CSPage from "@/components/B2CSPage";
import AddB2CSDetailsPage from "@/components/AddB2CSDetailsPage";
import NilRatedSuppliesPage from "@/components/NilRatedSuppliesPage";
import HsnSummaryPage from "@/components/HsnSummaryPage";
import DocumentsIssuedPage from "@/components/DocumentsIssuedPage";
import Gstr1SummaryPage from "@/components/Gstr1SummaryPage";
import Gstr3bPrepareOnlinePage from "@/components/Gstr3bPrepareOnlinePage";
import Gstr3bSection31Page from "@/components/Gstr3bSection31Page";
import Gstr3bEligibleItcPage from "@/components/Gstr3bEligibleItcPage";
import Gstr3bPaymentOfTaxPage from "@/components/Gstr3bPaymentOfTaxPage";
import { AuthProvider } from "./context/AuthContext";
import { TaxPeriodProvider } from "./context/TaxPeriodContext";
import AuthCallback from "@/pages/AuthCallback";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

/**
 * App Component
 * UI ONLY - No backend, no authentication logic
 * Routes: /login, /register
 */

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <TaxPeriodProvider>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Returns Routes - Protected */}
              <Route path="/returns" element={
                <ProtectedRoute>
                  <FileReturnsPage />
                </ProtectedRoute>
              } />
              <Route path="/file-returns" element={
                <ProtectedRoute>
                  <FileReturnsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/returns/gstr1/prepare-online" element={
                <ProtectedRoute>
                  <Gstr1PrepareOnlinePage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/b2b" element={
                <ProtectedRoute>
                  <B2BPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/b2b/add" element={
                <ProtectedRoute>
                  <AddB2BRecordPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/b2cs" element={
                <ProtectedRoute>
                  <B2CSPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/b2cs/add" element={
                <ProtectedRoute>
                  <AddB2CSDetailsPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/nil-rated" element={
                <ProtectedRoute>
                  <NilRatedSuppliesPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/hsn-summary" element={
                <ProtectedRoute>
                  <HsnSummaryPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/documents-issued" element={
                <ProtectedRoute>
                  <DocumentsIssuedPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr1/summary" element={
                <ProtectedRoute>
                  <Gstr1SummaryPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr3b/prepare-online" element={
                <ProtectedRoute>
                  <Gstr3bPrepareOnlinePage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr3b/3-1" element={
                <ProtectedRoute>
                  <Gstr3bSection31Page />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr3b/eligible-itc" element={
                <ProtectedRoute>
                  <Gstr3bEligibleItcPage />
                </ProtectedRoute>
              } />
              <Route path="/returns/gstr3b/payment-of-tax" element={
                <ProtectedRoute>
                  <Gstr3bPaymentOfTaxPage />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
              </Routes>
            </TaxPeriodProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
