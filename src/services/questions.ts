import { supabase } from '@/integrations/supabase/client';

export function getQuestions() {
  return supabase.from('questions').select('*').order('created_at', { ascending: false });
}

export function getQuestionsByIds(ids: string[]) {
  return supabase.from('questions').select('*').in('id', ids);
}

export function createQuestion(data: {
  title: string;
  description: string | null;
  resolution_criteria: string | null;
  tags: string[];
  close_date: string;
  author_id: string | undefined;
}) {
  return supabase.from('questions').insert(data);
}

export function resolveQuestion(questionId: string, outcome: 'yes' | 'no') {
  return supabase
    .from('questions')
    .update({ resolution_status: outcome, resolution_date: new Date().toISOString() })
    .eq('id', questionId);
}

export function editQuestion(
  questionId: string,
  data: { title: string; description: string; resolution_criteria: string; close_date: string; tags: string[] },
) {
  return supabase.from('questions').update(data).eq('id', questionId);
}

export function deleteQuestion(questionId: string) {
  return supabase.from('questions').delete().eq('id', questionId);
}
