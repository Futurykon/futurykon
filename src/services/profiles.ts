import { supabase } from '@/integrations/supabase/client';

export function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).single();
}


export function updateDisplayName(userId: string, displayName: string | null) {
  return supabase.from('profiles').update({ display_name: displayName }).eq('id', userId);
}
