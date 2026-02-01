import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthDebug = () => {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session:', session);
      setUser(session?.user);
    });
  }, []);
  
  return (
    <div className="fixed bottom-4 left-4 bg-black text-white p-2 text-xs rounded z-50">
      {user ? `Logged in: ${user.email}` : 'Not logged in'}
    </div>
  );
};
