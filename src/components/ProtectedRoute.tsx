import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('ProtectedRoute - Session check:', !!session);
      setAuthenticated(!!session);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('ProtectedRoute - Auth changed:', !!session);
        setAuthenticated(!!session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    console.log('ProtectedRoute - Redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
