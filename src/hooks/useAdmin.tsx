import { useAuth } from './useAuth';

interface UseAdminResult {
  isAdmin: boolean;
  loading: boolean;
}

// Thin re-export of the admin status held in the auth context. is_admin is
// fetched once per session by AuthProvider (see useAuth.tsx) — this hook no
// longer issues its own profile fetch, so it's safe to call from any number
// of component instances.
export const useAdmin = (): UseAdminResult => {
  const { isAdmin, isAdminLoading } = useAuth();
  return { isAdmin, loading: isAdminLoading };
};
