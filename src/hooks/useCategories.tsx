import { useState, useEffect } from 'react';
import { getCategories, type Category } from '@/services/categories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await getCategories();
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { categories, loading, reload: load };
}

export type { Category };
