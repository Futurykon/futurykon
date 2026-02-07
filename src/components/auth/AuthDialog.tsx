import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const AuthDialog = ({ open, onOpenChange, title = "Zaloguj się do Futurykon" }: AuthDialogProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
  };

  const sendMagicLink = async () => {
    setIsLoading(true);
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {}

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({ title: "Błąd wysyłania", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Link wysłany!", description: "Sprawdź swoją skrzynkę e-mail i kliknij w link logowania." });
        setEmail("");
      }
    } catch {
      toast({ title: "Błąd", description: "Wystąpił nieoczekiwany błąd", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMagicLink();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
              <Mail className="w-4 h-4" />
              Bezpieczne logowanie bez hasła
            </div>
            <p className="text-muted-foreground text-sm">Używamy Magic Links - nie musisz pamiętać hasła!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Adres email</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.com"
                required
              />
              <p className="text-sm text-muted-foreground">Wyślemy Ci bezpieczny link logowania</p>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                <Mail className="w-4 h-4 mr-2" />
                {isLoading ? "Wysyłanie..." : "Wyślij Magic Link"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={sendMagicLink} disabled={isLoading}>
                {isLoading ? "Wysyłanie..." : "Utwórz nowe konto"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
