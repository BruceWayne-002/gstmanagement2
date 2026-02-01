import { supabase } from './supabase';

export const saveUserData = async <T>(key: string, payload: T) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: user.id,
        key,
        value: payload,
      },
      {
        onConflict: 'user_id,key',
      }
    );

  if (error) throw error;
};

export const loadUserData = async <T>(key: string): Promise<T | null> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;

  return (data?.value as T | undefined) ?? null;
};
