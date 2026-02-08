import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut } from "lucide-react";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, is_admin')
      .eq('id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name);
      setIsAdmin(data.is_admin || false);
    }
  };

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
            <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Ranking
            </Link>
            {user && (
              <>
                <Link to="/my-predictions" className="text-muted-foreground hover:text-foreground transition-colors">
                  Moje predykcje
                </Link>
                {isAdmin ? (
                  <Link to="/ask" className="text-muted-foreground hover:text-foreground transition-colors">
                    Zadaj pytanie
                  </Link>
                ) : (
                  <Link to="/suggest" className="text-muted-foreground hover:text-foreground transition-colors">
                    Zaproponuj pytanie
                  </Link>
                )}
              </>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/edit-profile" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {displayName || user.email}
                </Link>
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
