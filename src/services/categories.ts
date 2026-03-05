import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export function getCategories() {
  return supabase.from('categories').select('*').order('sort_order', { ascending: true });
}

export function createCategory(data: { name: string; color: string; sort_order: number }) {
  return supabase.from('categories').insert(data).select().single();
}

export async function updateCategory(
  id: string,
  data: { name?: string; color?: string },
  oldName?: string,
) {
  const { error } = await supabase.from('categories').update(data).eq('id', id);
  if (error) return { error };
  // Cascade name change to questions (array_replace via DB function)
  if (data.name && oldName && data.name !== oldName) {
    await supabase.rpc('rename_question_tag', { old_tag: oldName, new_tag: data.name });
  }
  return { error: null };
}

export function deleteCategory(id: string) {
  return supabase.from('categories').delete().eq('id', id);
}
