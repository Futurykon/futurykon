import { supabase } from '@/integrations/supabase/client';

export function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).single();
}

export function getIsAdmin(userId: string) {
  return supabase.from('profiles').select('is_admin').eq('id', userId).single();
}

export function getDisplayName(userId: string) {
  return supabase.from('profiles').select('display_name').eq('id', userId).single();
}

export function updateDisplayName(userId: string, displayName: string | null) {
  return supabase.from('profiles').update({ display_name: displayName }).eq('id', userId);
}
