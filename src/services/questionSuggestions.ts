import { supabase } from '@/integrations/supabase/client';

export function getPendingSuggestions() {
  return supabase
    .from('question_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
}

export function createSuggestion(data: {
  title: string;
  description: string | null;
  category: string;
  close_date: string;
  suggested_by: string;
}) {
  return supabase.from('question_suggestions').insert(data);
}

export function approveSuggestion(id: string) {
  return supabase.from('question_suggestions').update({ status: 'approved' }).eq('id', id);
}

export function rejectSuggestion(id: string) {
  return supabase.from('question_suggestions').update({ status: 'rejected' }).eq('id', id);
}
