import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/context/AuthContext";

/**
 * Index Page - Redirects to Login
 * UI ONLY - No backend logic
 */
const Index = () => {
  const navigate = useNavigate();
  const { loading, session } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [loading, session, navigate]);

  return (
    <AuthLayout title="Loading" subtitle="Please wait">
      <div className="h-11 w-full flex items-center justify-center">
        <div className="animate-pulse h-2 w-32 bg-muted rounded" />
      </div>
    </AuthLayout>
  );
};

export default Index;
