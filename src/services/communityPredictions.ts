import { supabase } from '@/integrations/supabase/client';
import type { CommunityPrediction } from '@/types';

export async function getCommunityPredictions(): Promise<{
  data: CommunityPrediction[] | null;
  error: Error | null;
}> {
  const result = await (supabase
    .from('community_predictions' as never)
    .select('question_id, community_probability, prediction_count') as unknown as Promise<{
    data: CommunityPrediction[] | null;
    error: Error | null;
  }>);
  return result;
}
