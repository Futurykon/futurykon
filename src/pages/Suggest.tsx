import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { createSuggestion } from "@/services/questionSuggestions";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";

const Suggest = () => {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { categories } = useCategories();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Wymagane logowanie",
        description: "Musisz być zalogowany, aby zaproponować pytanie.",
        variant: "destructive"
      });
      navigate('/signin');
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
      const { error } = await createSuggestion({
        title: question,
        description: description || null,
        category: category,
        close_date: endDate.toISOString(),
        suggested_by: user.id,
      });

      if (error) {
        console.error('Error creating suggestion:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się utworzyć propozycji. Spróbuj ponownie.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sukces!",
          description: "Propozycja została wysłana. Administrator rozpatrzy ją wkrótce."
        });
        navigate('/questions');
      }
    } catch (err) {
      console.error('Error creating suggestion:', err);
      toast({
        title: "Błąd",
        description: "Wystąpił nieoczekiwany błąd.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Zaproponuj pytanie</h1>
            <p className="text-xl text-muted-foreground font-serif">
              Masz pomysł na ciekawe pytanie o AI? Podziel się nim z społecznością!
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Propozycja pytania
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
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data rozstrzygnięcia*</Label>
                    <DatePicker
                      date={endDate}
                      onDateChange={setEndDate}
                      disabled={(date) => date < new Date()}
                      placeholder="Wybierz datę rozstrzygnięcia"
                    />
                    <p className="text-sm text-muted-foreground">
                      Kiedy pytanie powinno zostać rozstrzygnięte?
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Informacja:</strong> Twoja propozycja zostanie wysłana do administratora,
                    który zdecyduje, czy zostanie ona opublikowana jako pytanie.
                  </p>
                </div>

                <div className="border-t pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={!question || !category || !endDate || isSubmitting}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Wysyłanie..." : "Wyślij propozycję"}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link to="/questions">Anuluj</Link>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Suggest;
