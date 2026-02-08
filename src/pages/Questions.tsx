import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MessageSquare, TrendingUp, Users, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { format, isToday, isThisYear } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Header } from '@/components/Header';

function formatPredictionDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isThisYear(date)) return format(date, 'd MMM', { locale: pl });
  return format(date, 'd MMM yyyy', { locale: pl });
}

interface UserPredictionGroup {
  user_id: string;
  user_email?: string;
  latest: Prediction;
  history: Prediction[]; // older predictions, newest first
}

function groupPredictionsByUser(preds: Prediction[]): UserPredictionGroup[] {
  const map = new Map<string, Prediction[]>();
  // preds are already sorted newest-first from the fetch
  for (const p of preds) {
    const arr = map.get(p.user_id);
    if (arr) arr.push(p);
    else map.set(p.user_id, [p]);
  }
  const groups: UserPredictionGroup[] = [];
  for (const [userId, userPreds] of map) {
    groups.push({
      user_id: userId,
      user_email: userPreds[0].user_email,
      latest: userPreds[0],
      history: userPreds.slice(1),
    });
  }
  // Sort groups by latest prediction date, newest first
  groups.sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
  return groups;
}

interface Question {
  id: string;
  title: string;
  description: string;
  resolution_criteria: string;
  close_date: string;
  created_at: string;
  resolution_status: string;
  resolution_date: string | null;
  author_id: string | null;
}

interface Prediction {
  id: string;
  question_id: string;
  user_id: string;
  probability: number;
  reasoning: string;
  created_at: string;
  user_email?: string;
}

interface CommunityPrediction {
  question_id: string;
  community_probability: number | null;
  prediction_count: number;
}

function PredictionThread({ predictions, currentUserId }: { predictions: Prediction[]; currentUserId?: string }) {
  const groups = groupPredictionsByUser(predictions);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const uniqueUserCount = groups.length;

  const toggleExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">
          Predykcje ({predictions.length} od {uniqueUserCount} {uniqueUserCount === 1 ? 'użytkownika' : 'użytkowników'})
        </h4>
      </div>
      <div className="space-y-3">
        {groups.map((group) => {
          const isOwn = currentUserId === group.user_id;
          const isExpanded = expandedUsers.has(group.user_id);
          const hasHistory = group.history.length > 0;

          return (
            <div
              key={group.user_id}
              className={`p-3 rounded-lg text-sm ${isOwn ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}
            >
              {/* Latest prediction */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {group.user_email ?? 'Anonim'}
                    {isOwn && <span className="text-primary ml-1">(Ty)</span>}
                  </span>
                  <span className="font-semibold text-primary">{group.latest.probability}%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatPredictionDate(group.latest.created_at)}
                </span>
              </div>
              {group.latest.reasoning && (
                <p className="text-muted-foreground mt-1">{group.latest.reasoning}</p>
              )}

              {/* Expandable history */}
              {hasHistory && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleExpand(group.user_id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {group.history.length} wcześniejsz{group.history.length === 1 ? 'a aktualizacja' : 'ych aktualizacji'}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
                      {group.history.map((pred) => (
                        <div key={pred.id} className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pred.probability}%</span>
                            <span>{formatPredictionDate(pred.created_at)}</span>
                          </div>
                          {pred.reasoning && (
                            <p className="mt-0.5">{pred.reasoning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction[]>>({});
  const [communityPredictions, setCommunityPredictions] = useState<Record<string, CommunityPrediction>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [probability, setProbability] = useState([50]);
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuestions();
    fetchPredictions();
    fetchCommunityPredictions();
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

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
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching predictions:', error);
      return;
    }

    const predictionMap: Record<string, Prediction[]> = {};
    data?.forEach((row: Prediction) => {
      const prediction: Prediction = {
        id: row.id,
        question_id: row.question_id,
        user_id: row.user_id,
        probability: row.probability,
        reasoning: row.reasoning,
        created_at: row.created_at,
        user_email: row.profiles?.email ?? undefined,
      };
      if (!predictionMap[prediction.question_id]) {
        predictionMap[prediction.question_id] = [];
      }
      predictionMap[prediction.question_id].push(prediction);
    });
    setPredictions(predictionMap);
  };

  const fetchCommunityPredictions = async () => {
    const { data, error } = await supabase
      .from('community_predictions')
      .select('question_id, community_probability, prediction_count');

    if (error) {
      console.error('Error fetching community predictions:', error);
      return;
    }

    const communityMap: Record<string, CommunityPrediction> = {};
    data?.forEach((cp) => {
      communityMap[cp.question_id] = cp;
    });
    setCommunityPredictions(communityMap);
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

        <div className="grid gap-6">
          {questions.map((question) => {
            const userPrediction = getUserPrediction(question.id);
            const allPredictions = predictions[question.id] || [];
            const communityPrediction = communityPredictions[question.id];
            const expired = isExpired(question.close_date);

            return (
              <Card key={question.id} className="w-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{question.title}</CardTitle>
                      <CardDescription className="text-base">
                        {question.description}
                      </CardDescription>
                    </div>
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
                  </div>
                </CardHeader>
                <CardContent>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
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