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
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Header } from '@/components/Header';

interface Question {
  id: string;
  title: string;
  description: string;
  resolution_criteria: string;
  close_date: string;
  created_at: string;
}

interface Prediction {
  id: string;
  question_id: string;
  probability: number;
  reasoning: string;
  created_at: string;
}

interface CommunityPrediction {
  question_id: string;
  community_probability: number | null;
  prediction_count: number;
}

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [communityPredictions, setCommunityPredictions] = useState<Record<string, CommunityPrediction>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [probability, setProbability] = useState([50]);
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuestions();
    fetchPredictions();
    fetchCommunityPredictions();
  }, [user]);

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
    if (!user) return;
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching predictions:', error);
      return;
    }

    const predictionMap: Record<string, Prediction> = {};
    data?.forEach((prediction) => {
      predictionMap[prediction.question_id] = prediction;
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

  const handleEditPrediction = (question: Question) => {
    const existingPrediction = predictions[question.id];
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
      probability: probability[0],
      reasoning: reasoning
    };

    const { error } = await supabase
      .from('predictions')
      .upsert(predictionData, { onConflict: 'question_id,user_id' });

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
            const userPrediction = predictions[question.id];
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

                  {userPrediction && selectedQuestion !== question.id ? (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="font-medium">Twoja predykcja: {userPrediction.probability}%</span>
                        </div>
                        {!expired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPrediction(question)}
                          >
                            Edytuj
                          </Button>
                        )}
                      </div>
                      {userPrediction.reasoning && (
                        <p className="text-sm text-muted-foreground">{userPrediction.reasoning}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Zapisano: {format(new Date(userPrediction.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })}
                      </p>
                    </div>
                  ) : selectedQuestion === question.id ? (
                    <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="probability-input" className="text-base font-medium">
                                Prawdopodobieństwo: {probability[0]}%
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="probability-input"
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min={0}
                                  max={100}
                                  value={Number.isFinite(probability[0]) ? probability[0] : 0}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    let num = parseFloat(raw);
                                    if (isNaN(num)) {
                                      setProbability([0]);
                                      return;
                                    }
                                    // Clamp 0–100 and truncate to 2 decimals (no rounding)
                                    num = Math.max(0, Math.min(100, num));
                                    num = Math.trunc(num * 100) / 100;
                                    setProbability([num]);
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
                                  // Slider interaction rounds to full integers
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
                  ) : !userPrediction && !expired ? (
                    <div>
                      {user ? (
                        <Button onClick={() => setSelectedQuestion(question.id)}>
                          Dodaj predykcję
                        </Button>
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
                ) : !userPrediction && expired ? (
                  <div className="text-muted-foreground text-sm">
                    To pytanie zostało już zamknięte dla nowych predykcji.
                  </div>
                ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}