import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * AuthLayout - Shared layout wrapper for authentication pages
 * Provides the gradient background and centered card container
 * UI ONLY - No backend logic
 */
const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen auth-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo/Branding Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4 auth-card">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-primary-foreground/80 text-sm">{subtitle}</p>
          )}
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-xl p-8 auth-card">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-primary-foreground/60 text-xs mt-6">
          © 2024 Secure Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
