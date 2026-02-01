import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export const useSupabaseStorage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Storage Hook - Session:', session?.user?.email);
      setUser(session?.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('Storage Hook - Auth changed:', session?.user?.email);
        setUser(session?.user);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Helper to ensure we have the latest user
  const getUser = async (): Promise<User | undefined> => {
    if (user) return user;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user;
  };

  return {
    async set(key: string, value: unknown) {
      const currentUser = await getUser();
      if (!currentUser) throw new Error('User not authenticated');
      
      try {
        console.log('Saving to Supabase:', key);
        const { data, error } = await supabase
          .from('user_data')
          .upsert(
            {
              user_id: currentUser.id,
              key: key,
              value: value,
            },
            {
              onConflict: 'user_id,key',
            }
          )
          .select()
          .single();

        if (error) {
          console.error('Supabase set error:', error);
          throw error;
        }
        
        console.log('Saved successfully:', key);
        return { key: data.key, value: data.value, shared: false };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Storage set failed:', msg);
        throw error;
      }
    },

    async get(key: string) {
      const currentUser = await getUser();
      if (!currentUser) {
        console.warn('Storage get: No user authenticated');
        return null;
      }

      try {
        console.log('Loading from Supabase:', key);
        // Use maybeSingle to avoid error when row is missing
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('key', key)
          .maybeSingle();

        if (error) {
          console.error(`Supabase get error for ${key}:`, error);
          return null;
        }

        if (!data) {
          console.log(`Key "${key}" not found`);
          return null;
        }

        console.log('Loaded successfully:', key);
        return { key: data.key, value: data.value, shared: false };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Storage get failed:', msg);
        return null;
      }
    },

    async delete(key: string) {
      const currentUser = await getUser();
      if (!currentUser) throw new Error('User not authenticated');

      try {
        const { error } = await supabase
          .from('user_data')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('key', key);

        if (error) throw error;
        return { key, deleted: true, shared: false };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Storage delete failed:', msg);
        return null;
      }
    },

    async list(prefix?: string) {
      const currentUser = await getUser();
      if (!currentUser) return { keys: [], prefix };

      try {
        let query = supabase
          .from('user_data')
          .select('key')
          .eq('user_id', currentUser.id);

        if (prefix) {
          query = query.ilike('key', `${prefix}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          keys: data?.map(item => item.key) || [],
          prefix,
          shared: false
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Storage list failed:', msg);
        return { keys: [], prefix };
      }
    }
  };
};
