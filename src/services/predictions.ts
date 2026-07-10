import { supabase } from '@/integrations/supabase/client';

export function getAllPredictions() {
  return supabase
    .from('predictions')
    .select('*, profiles(email, display_name)')
    .order('created_at', { ascending: false });
}

export function getUserPredictions(userId: string) {
  return supabase
    .from('predictions')
    .select('*, profiles(email, display_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export function getMyPredictions(userId: string) {
  return supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

// The leaderboard ranking rule (per-user avg log_score across resolved
// questions, gated by the 5-distinct-questions participation threshold, sorted
// descending) lives entirely in the `leaderboard` DB view. This is a thin read.
export function getLeaderboard() {
  return supabase
    .from('leaderboard')
    .select('user_id, email, display_name, avg_log_score, scored_count');
}

export function createPrediction(data: {
  question_id: string;
  user_id: string;
  probability: number;
  reasoning: string;
}) {
  return supabase.from('predictions').insert(data);
}
