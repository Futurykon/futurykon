import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Brain, TrendingUp, Calendar as CalendarLucide, ShieldX, CheckCircle, XCircle } from "lucide-react";
import { useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/categories";
import type { QuestionSuggestion } from "@/types";

const AskQuestion = () => {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);

  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      if (isAdmin) {
        await fetchSuggestions();
      }
    };
    loadData();
  }, [isAdmin]);

  const fetchSuggestions = async () => {
    const { data, error } = await supabase
      .from('question_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSuggestions(data as QuestionSuggestion[]);
    }
  };

  const approveSuggestion = async (suggestion: QuestionSuggestion) => {
    setIsSubmitting(true);

    // Create the question
    const { error: questionError } = await supabase.from('questions').insert({
      title: suggestion.title,
      description: suggestion.description,
      resolution_criteria: suggestion.description || null,
      category: suggestion.category,
      close_date: suggestion.close_date,
      author_id: user?.id
    });

    if (questionError) {
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć pytania.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Mark suggestion as approved
    const { error: updateError } = await supabase
      .from('question_suggestions')
      .update({ status: 'approved' })
      .eq('id', suggestion.id);

    if (updateError) {
      toast({
        title: "Uwaga",
        description: "Pytanie utworzone, ale nie udało się zaktualizować statusu propozycji.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sukces!",
        description: "Pytanie zostało utworzone z propozycji."
      });
      fetchSuggestions();
    }

    setIsSubmitting(false);
  };

  const rejectSuggestion = async (suggestionId: string) => {
    setIsSubmitting(true);

    const { error } = await supabase
      .from('question_suggestions')
      .update({ status: 'rejected' })
      .eq('id', suggestionId);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się odrzucić propozycji.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sukces",
        description: "Propozycja została odrzucona."
      });
      fetchSuggestions();
    }

    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isAdmin) {
      toast({
        title: "Brak uprawnień",
        description: "Tylko administratorzy mogą tworzyć pytania.",
        variant: "destructive"
      });
      return;
    }

    if (!question || !category || !endDate) {
      toast({
        title: "Brakujące dane",
        description: "Wypełnij wszystkie wymagane pola.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('questions').insert({
        title: question,
        description: description || null,
        resolution_criteria: description || null,
        category: category,
        close_date: endDate.toISOString(),
        author_id: user.id
      });

      if (error) {
        console.error('Error creating question:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się utworzyć pytania. Spróbuj ponownie.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sukces!",
          description: "Pytanie zostało utworzone."
        });
        navigate('/questions');
      }
    } catch (err) {
      console.error('Error creating question:', err);
      toast({
        title: "Błąd",
        description: "Wystąpił nieoczekiwany błąd.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
          </div>
        </main>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <Card>
              <CardContent className="pt-6">
                <ShieldX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
                <p className="text-muted-foreground mb-4">
                  Tworzenie nowych pytań jest dostępne tylko dla administratorów.
                </p>
                <Button asChild>
                  <Link to="/questions">Przeglądaj pytania</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Zadaj pytanie o AI</h1>
            <p className="text-xl text-muted-foreground font-serif">
              Stwórz nową prognozę o rozwoju sztucznej inteligencji
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Nowa prognoza AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="question">Pytanie prognostyczne*</Label>
                  <Input
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Np. Czy GPT-5 zostanie wydane przed końcem 2025 roku?"
                    required
                    className="text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Sformułuj pytanie tak, aby można było na nie odpowiedzieć "tak" lub "nie"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Opis i kryteria (opcjonalne)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Dodaj dodatkowe informacje, źródła danych, kryteria rozstrzygnięcia..."
                    rows={4}
                    className="text-base"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategoria*</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data rozstrzygnięcia*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd MMMM yyyy", { locale: pl }) : "Wybierz datę"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          locale={pl}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground">
                      Kiedy pytanie zostanie rozstrzygnięte?
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={!question || !category || !endDate || isSubmitting}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Publikowanie..." : "Opublikuj prognozę"}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link to="/">Anuluj</Link>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="mt-8 bg-muted/30">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarLucide className="w-5 h-5 text-primary" />
                Wskazówki
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Sformułuj pytanie jednoznacznie - unikaj wieloznaczności</li>
                <li>• Podaj konkretną datę rozstrzygnięcia</li>
                <li>• Określ jasne kryteria sukcesu w opisie</li>
                <li>• Sprawdź, czy podobne pytanie już nie istnieje</li>
              </ul>
            </CardContent>
          </Card>

          {/* Pending Suggestions (Admin only) */}
          {suggestions.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Oczekujące propozycje ({suggestions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{suggestion.title}</h4>
                      {suggestion.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span>Kategoria: {suggestion.category}</span>
                        {suggestion.close_date && (
                          <span>
                            Rozstrzygnięcie: {format(new Date(suggestion.close_date), 'd MMM yyyy', { locale: pl })}
                          </span>
                        )}
                        <span className="text-xs">
                          {format(new Date(suggestion.created_at), 'd MMM yyyy', { locale: pl })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveSuggestion(suggestion)}
                          disabled={isSubmitting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Zatwierdź
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectSuggestion(suggestion.id)}
                          disabled={isSubmitting}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Odrzuć
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default AskQuestion;