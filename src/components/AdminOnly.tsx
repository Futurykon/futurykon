import type { ReactNode } from 'react';
import { useAdmin } from '@/hooks/useAdmin';

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, loading } = useAdmin();
  if (loading || !isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
