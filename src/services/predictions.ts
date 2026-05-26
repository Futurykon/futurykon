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

export async function getQuestionScores(): Promise<{
  data: Array<{ question_id: string; user_id: string; log_score: number; profiles?: { email?: string; display_name?: string } }> | null;
  error: Error | null;
}> {
  return (supabase
    .from('question_scores' as never)
    .select('question_id, user_id, log_score, profiles(email, display_name)') as unknown as Promise<{
    data: Array<{ question_id: string; user_id: string; log_score: number; profiles?: { email?: string; display_name?: string } }> | null;
    error: Error | null;
  }>);
}

export function getPredictionCountsPerUser() {
  return supabase.from('predictions').select('user_id, question_id');
}

export function createPrediction(data: {
  question_id: string;
  user_id: string;
  probability: number;
  reasoning: string;
}) {
  return supabase.from('predictions').insert(data);
}
