import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';

interface AdminRouteProps {
  children: ReactNode;
}

// Like ProtectedRoute, but also requires isAdmin. Non-authenticated users
// are sent to sign in; authenticated non-admins are redirected to /questions.
export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading, isAdmin, isAdminLoading } = useAuth();
  const location = useLocation();

  // Wait for the session check, and — once we know there's a user — for the
  // admin check too, so admins aren't bounced during the initial fetch.
  if (loading || (user && isAdminLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/questions" replace />;
  }

  return <>{children}</>;
};
