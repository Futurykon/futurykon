import { supabase } from '@/integrations/supabase/client';
import type { CommunityPrediction } from '@/types';

export async function getCommunityPredictions(): Promise<{
  data: CommunityPrediction[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('community_predictions')
    .select('question_id, community_probability, prediction_count');
  return {
    data: data as CommunityPrediction[] | null,
    error,
  };
}
