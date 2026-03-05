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

export function getPredictionsWithBrierScores() {
  return supabase
    .from('predictions')
    .select('user_id, brier_score, profiles(email, display_name)')
    .not('brier_score', 'is', null);
}

export function createPrediction(data: {
  question_id: string;
  user_id: string;
  probability: number;
  reasoning: string;
}) {
  return supabase.from('predictions').insert(data);
}
