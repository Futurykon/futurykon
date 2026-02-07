import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { User, LogOut } from "lucide-react";

export const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-white/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-magenta hover:text-magenta/80 transition-colors">
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
              <Button variant="outline" size="sm" className="border-magenta/30 text-magenta hover:bg-magenta hover:text-white" asChild>
                <Link to="/signin">
                  <User className="w-4 h-4 mr-2" />
                  Logowanie
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
