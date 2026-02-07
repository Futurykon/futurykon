import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Mail } from 'lucide-react';
import { Header } from '@/components/Header';
import { AuthDialog } from '@/components/auth/AuthDialog';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(true);

  if (loading) {
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header />
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} title="Zaloguj się do Futurykon" />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Button variant="outline" onClick={() => setAuthOpen(true)}>
            Otwórz okno logowania
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};