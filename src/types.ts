// Shared TypeScript interfaces for Futurykon

export interface Question {
  id: string;
  title: string;
  description: string;
  resolution_criteria: string;
  close_date: string;
  created_at: string;
  resolution_status: string;
  resolution_date: string | null;
  author_id: string | null;
  category?: string | null;
}

export interface Prediction {
  id: string;
  question_id: string;
  user_id: string;
  probability: number;
  reasoning: string;
  created_at: string;
  updated_at?: string;
  brier_score?: number | null;
  time_weighted_score?: number | null;
  user_email?: string;
  user_display_name?: string;
  profiles?: {
    email?: string;
    display_name?: string;
  };
}

export interface CommunityPrediction {
  question_id: string;
  community_probability: number | null;
  prediction_count: number;
}

export interface Profile {
  id: string;
  email: string;
  display_name?: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionSuggestion {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  close_date: string | null;
  suggested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

export interface UserPredictionGroup {
  user_id: string;
  user_email?: string;
  user_display_name?: string;
  latest: Prediction;
  history: Prediction[]; // older predictions, newest first
}
