import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Thin reader of the admin status already fetched once by AuthProvider —
// mounting many AdminOnly instances (e.g. two per QuestionCard in a long
// list) no longer triggers a profile fetch per instance.
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, isAdminLoading } = useAuth();
  if (isAdminLoading || !isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
