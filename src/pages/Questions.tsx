import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Users, CheckCircle, XCircle, Edit, Trash2, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Header } from '@/components/Header';
import { PredictionThread } from '@/components/PredictionThread';
import { PredictionHistoryChart } from '@/components/PredictionHistoryChart';
import type { Question, Prediction, CommunityPrediction } from '@/types';

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction[]>>({});
  const [communityPredictions, setCommunityPredictions] = useState<Record<string, CommunityPrediction>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [probability, setProbability] = useState([50]);
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCriteria, setEditCriteria] = useState('');
  const [editCloseDate, setEditCloseDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      await fetchQuestions();
      await fetchPredictions();
      await fetchCommunityPredictions();
      if (user) {
        await checkAdminStatus();
      }
    };
    loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setIsAdmin(data.is_admin || false);
    }
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }

    setQuestions(data || []);
  };

  const fetchPredictions = async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select('*, profiles(email, display_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching predictions:', error);
      return;
    }

    const predictionMap: Record<string, Prediction[]> = {};
    if (data) {
      for (const row of data) {
        const prediction: Prediction = {
          id: row.id,
          question_id: row.question_id,
          user_id: row.user_id,
          probability: row.probability,
          reasoning: row.reasoning,
          created_at: row.created_at,
          profiles: (row as { profiles?: { email?: string; display_name?: string } }).profiles,
        };
        if (!predictionMap[prediction.question_id]) {
          predictionMap[prediction.question_id] = [];
        }
        predictionMap[prediction.question_id].push(prediction);
      }
    }
    setPredictions(predictionMap);
  };

  const fetchCommunityPredictions = async () => {
    try {
      // Cast to unknown first, then to our expected type to bypass Supabase type checking
      const result = await supabase
        .from('community_predictions' as never)
        .select('question_id, community_probability, prediction_count') as unknown as {
          data: Array<{
            question_id: string;
            community_probability: number | null;
            prediction_count: number;
          }> | null;
          error: Error | null;
        };

      const { data, error } = result;

      if (error) {
        console.error('Error fetching community predictions:', error);
        return;
      }

      const communityMap: Record<string, CommunityPrediction> = {};
      if (data) {
        for (const cp of data) {
          communityMap[cp.question_id] = cp;
        }
      }
      setCommunityPredictions(communityMap);
    } catch (err) {
      console.error('Error fetching community predictions:', err);
    }
  };

  const getUserPrediction = (questionId: string): Prediction | undefined => {
    if (!user) return undefined;
    // predictions are sorted newest-first, so first match is the latest
    return predictions[questionId]?.find((p) => p.user_id === user.id);
  };

  const handleEditPrediction = (question: Question) => {
    const existingPrediction = getUserPrediction(question.id);
    if (existingPrediction) {
      setProbability([existingPrediction.probability]);
      setReasoning(existingPrediction.reasoning || '');
      setSelectedQuestion(question.id);
    }
  };

  const submitPrediction = async (questionId: string) => {
    if (!probability[0] || !user) return;

    setIsSubmitting(true);

    const predictionData = {
      question_id: questionId,
      user_id: user.id,
      probability: Math.round(probability[0]),
      reasoning: reasoning
    };

    const { error } = await supabase
      .from('predictions')
      .insert(predictionData);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać predykcji.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Predykcja została zapisana!'
      });
      setSelectedQuestion(null);
      setProbability([50]);
      setReasoning('');
      fetchPredictions();
      fetchCommunityPredictions(); // Refresh community prediction after submitting
    }

    setIsSubmitting(false);
  };

  const isExpired = (closeDate: string) => {
    return new Date(closeDate) < new Date();
  };

  const resolveQuestion = async (questionId: string, outcome: 'yes' | 'no') => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('questions')
      .update({
        resolution_status: outcome,
        resolution_date: new Date().toISOString()
      })
      .eq('id', questionId);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się rozstrzygnąć pytania.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sukces',
        description: `Pytanie rozstrzygnięte jako ${outcome === 'yes' ? 'TAK' : 'NIE'}!`
      });
      fetchQuestions();
    }
    setIsSubmitting(false);
  };

  const startEditQuestion = (question: Question) => {
    setEditingQuestion(question.id);
    setEditTitle(question.title);
    setEditDescription(question.description || '');
    setEditCriteria(question.resolution_criteria || '');
    setEditCloseDate(new Date(question.close_date));
  };

  const saveEditQuestion = async (questionId: string) => {
    if (!editTitle || !editCloseDate) {
      toast({
        title: 'Błąd',
        description: 'Tytuł i data zamknięcia są wymagane.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('questions')
      .update({
        title: editTitle,
        description: editDescription,
        resolution_criteria: editCriteria,
        close_date: editCloseDate.toISOString()
      })
      .eq('id', questionId);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować pytania.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Pytanie zostało zaktualizowane!'
      });
      setEditingQuestion(null);
      fetchQuestions();
    }
    setIsSubmitting(false);
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to pytanie? Ta operacja jest nieodwracalna.')) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć pytania.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sukces',
        description: 'Pytanie zostało usunięte!'
      });
      fetchQuestions();
    }
    setIsSubmitting(false);
  };

  // Filter and sort questions
  const filteredQuestions = questions
    .filter((q) => {
      // Text search
      if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && q.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && (q.resolution_status !== 'pending' || isExpired(q.close_date))) {
        return false;
      }
      if (statusFilter === 'resolved' && q.resolution_status === 'pending') {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'closing':
          return new Date(a.close_date).getTime() - new Date(b.close_date).getTime();
        case 'predictions': {
          const aCount = communityPredictions[a.id]?.prediction_count || 0;
          const bCount = communityPredictions[b.id]?.prediction_count || 0;
          return bCount - aCount;
        }
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-arctic/10 to-lavender/10">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Prognozy rozwoju AI</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Sprawdź swoją umiejętność przewidywania przyszłości sztucznej inteligencji. Wybierz pytanie i podaj swoją predykcję w procentach.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj pytań..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Status tabs */}
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
                  <TabsList>
                    <TabsTrigger value="all">Wszystkie</TabsTrigger>
                    <TabsTrigger value="active">Aktywne</TabsTrigger>
                    <TabsTrigger value="resolved">Rozstrzygnięte</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Category filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Kategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie kategorie</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sortuj" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Najnowsze</SelectItem>
                    <SelectItem value="closing">Zamykane wkrótce</SelectItem>
                    <SelectItem value="predictions">Najwięcej predykcji</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {filteredQuestions.map((question) => {
            const userPrediction = getUserPrediction(question.id);
            const allPredictions = predictions[question.id] || [];
            const communityPrediction = communityPredictions[question.id];
            const expired = isExpired(question.close_date);

            return (
              <Card key={question.id} className="w-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{question.title}</CardTitle>
                        {question.category && (
                          <Badge variant="secondary" className="text-xs">
                            {question.category}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-base">
                        {question.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(question.close_date), 'd MMMM yyyy', { locale: pl })}
                          </span>
                        </div>
                        {expired && (
                          <div className="flex items-center gap-1 text-destructive">
                            <Clock className="w-4 h-4" />
                            <span>Zakończone</span>
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditQuestion(question)}
                            disabled={isSubmitting}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteQuestion(question.id)}
                            disabled={isSubmitting}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Edit form */}
                  {editingQuestion === question.id && (
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg space-y-4">
                      <h4 className="font-semibold">Edytuj pytanie</h4>
                      <div className="space-y-2">
                        <Label>Tytuł</Label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Opis</Label>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kryteria rozstrzygnięcia</Label>
                        <Textarea
                          value={editCriteria}
                          onChange={(e) => setEditCriteria(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data zamknięcia</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !editCloseDate && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {editCloseDate ? format(editCloseDate, "dd MMMM yyyy", { locale: pl }) : "Wybierz datę"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={editCloseDate}
                              onSelect={setEditCloseDate}
                              locale={pl}
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveEditQuestion(question.id)}
                          disabled={isSubmitting}
                        >
                          Zapisz zmiany
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingQuestion(null)}
                          disabled={isSubmitting}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Kryteria rozstrzygnięcia:</h4>
                    <p className="text-sm text-muted-foreground">{question.resolution_criteria}</p>
                  </div>

                  {/* Resolution status */}
                  {question.resolution_status !== 'pending' && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      question.resolution_status === 'yes'
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-center gap-2">
                        {question.resolution_status === 'yes' ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <div>
                          <div className={`font-bold text-lg ${
                            question.resolution_status === 'yes' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            Rozstrzygnięto: {question.resolution_status === 'yes' ? 'TAK' : 'NIE'}
                          </div>
                          {question.resolution_date && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(question.resolution_date), 'd MMMM yyyy', { locale: pl })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolution buttons for admins */}
                  {isAdmin && expired && question.resolution_status === 'pending' && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                      <h4 className="font-medium mb-3 text-amber-900">Rozstrzygnij pytanie (admin):</h4>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => resolveQuestion(question.id, 'yes')}
                          disabled={isSubmitting}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Rozstrzygnij jako TAK
                        </Button>
                        <Button
                          onClick={() => resolveQuestion(question.id, 'no')}
                          disabled={isSubmitting}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rozstrzygnij jako NIE
                        </Button>
                      </div>
                    </div>
                  )}

                  {communityPrediction && communityPrediction.prediction_count > 0 && (
                    <div className="mb-4 bg-magenta/5 border border-magenta/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-semibold text-lg">
                            Predykcja społeczności: {communityPrediction.community_probability?.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Na podstawie {communityPrediction.prediction_count} {communityPrediction.prediction_count === 1 ? 'predykcji' : 'predykcji'}
                          </div>
                        </div>
                      </div>

                      {/* Prediction history chart */}
                      {allPredictions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-magenta/20">
                          <h4 className="text-sm font-medium mb-3">Historia predykcji</h4>
                          <PredictionHistoryChart
                            predictions={allPredictions}
                            questionTitle={question.title}
                          />
                        </div>
                      )}

                      <div className="mt-3 text-xs text-muted-foreground">
                        Obliczona przy użyciu geometrycznej średniej szans (geometric mean of odds)
                      </div>
                    </div>
                  )}

                  {/* Prediction form / action area */}
                  {selectedQuestion === question.id ? (
                    <div className="space-y-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="probability-input" className="text-base font-medium">
                          Prawdopodobieństwo: {Math.round(probability[0])}%
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="probability-input"
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min={0}
                            max={100}
                            value={Number.isFinite(probability[0]) ? Math.round(probability[0]) : 0}
                            onChange={(e) => {
                              const num = parseInt(e.target.value, 10);
                              if (isNaN(num)) {
                                setProbability([0]);
                                return;
                              }
                              setProbability([Math.max(0, Math.min(100, num))]);
                            }}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>

                        <Slider
                          id="probability-slider"
                          min={0}
                          max={100}
                          step={1}
                          value={probability}
                          onValueChange={(vals) => {
                            const v = Array.isArray(vals) ? vals[0] : Number(vals);
                            setProbability([Math.round(v)]);
                          }}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="reasoning">Uzasadnienie (opcjonalne)</Label>
                        <Textarea
                          id="reasoning"
                          placeholder="Dlaczego uważasz, że to prawdopodobieństwo jest poprawne?"
                          value={reasoning}
                          onChange={(e) => setReasoning(e.target.value)}
                          className="mt-2"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => submitPrediction(question.id)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          {isSubmitting ? 'Zapisywanie...' : userPrediction ? 'Zaktualizuj predykcję' : 'Zapisz predykcję'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedQuestion(null);
                            setProbability([50]);
                            setReasoning('');
                          }}
                          disabled={isSubmitting}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : !expired ? (
                    <div className="mb-4">
                      {user ? (
                        userPrediction ? (
                          <Button variant="outline" size="sm" onClick={() => handleEditPrediction(question)}>
                            Zaktualizuj predykcję
                          </Button>
                        ) : (
                          <Button onClick={() => setSelectedQuestion(question.id)}>
                            Dodaj predykcję
                          </Button>
                        )
                      ) : (
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                          <p className="text-muted-foreground mb-2">
                            Zaloguj się, aby dodać swoją predykcję
                          </p>
                          <Button variant="outline" asChild>
                            <a href="/signin">Przejdź do logowania</a>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : !userPrediction ? (
                    <div className="text-muted-foreground text-sm mb-4">
                      To pytanie zostało już zamknięte dla nowych predykcji.
                    </div>
                  ) : null}

                  {/* All predictions – comment thread grouped by user */}
                  {allPredictions.length > 0 && (
                    <PredictionThread predictions={allPredictions} currentUserId={user?.id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}