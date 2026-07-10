// Shared TypeScript interfaces for Futurykon
//
// App-facing types are derived from the generated Supabase `Tables<>` row
// shapes (see src/integrations/supabase/types.ts) plus any client-side-only
// extensions (e.g. joined `profiles` data attached in service queries).

import type { Tables } from '@/integrations/supabase/types';

export type Question = Tables<'questions'>;

export type Prediction = Tables<'predictions'> & {
  user_email?: string;
  user_display_name?: string;
  profiles?: {
    email?: string;
    display_name?: string;
  };
};

export type CommunityPrediction = Pick<
  Tables<'community_predictions'>,
  'question_id' | 'community_probability'
> & {
  prediction_count: number;
};

export type Profile = Tables<'profiles'>;

export type QuestionSuggestion = Tables<'question_suggestions'>;

export type QuestionScore = Tables<'question_scores'>;

export interface UserPredictionGroup {
  user_id: string;
  user_email?: string;
  user_display_name?: string;
  latest: Prediction;
  history: Prediction[]; // older predictions, newest first
}
