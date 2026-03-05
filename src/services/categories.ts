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
  // Cascade name change to questions
  if (data.name && oldName && data.name !== oldName) {
    await supabase.from('questions').update({ category: data.name }).eq('category', oldName);
  }
  return { error: null };
}

export function deleteCategory(id: string) {
  return supabase.from('categories').delete().eq('id', id);
}
