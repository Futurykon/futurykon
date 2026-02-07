import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { User, LogOut } from "lucide-react";
import { AuthDialog } from "@/components/auth/AuthDialog";

export const Header = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
            Futurykon
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link to="/questions" className="text-muted-foreground hover:text-foreground transition-colors">
              Pytania
            </Link>
            <Link to="/ask" className="text-muted-foreground hover:text-foreground transition-colors">
              Zadaj pytanie
            </Link>
            
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Wyloguj
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Logowanie
                </Button>
                <AuthDialog open={authOpen} onOpenChange={setAuthOpen} title="Zaloguj się do Futurykon" />
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
