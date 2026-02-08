import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, TrendingUp, Target, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Prediction, Question } from '@/types';

interface QuestionWithPrediction {
  question: Question;
  latestPrediction: Prediction;
  predictionCount: number;
}

export default function MyPredictions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questionPredictions, setQuestionPredictions] = useState<QuestionWithPrediction[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPredictions: 0,
    questionsCount: 0,
    avgBrierScore: null as number | null,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        navigate('/signin');
        return;
      }
      await loadPredictions();
    };
    loadData();
  }, [user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPredictions = async () => {
    if (!user) return;

    // Fetch all user's predictions
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !predictions) {
      setLoading(false);
      return;
    }

    // Group by question (get latest per question)
    const questionMap = new Map<string, Prediction[]>();
    for (const pred of predictions) {
      if (!questionMap.has(pred.question_id)) {
        questionMap.set(pred.question_id, []);
      }
      questionMap.get(pred.question_id)!.push(pred);
    }

    // Fetch questions
    const questionIds = Array.from(questionMap.keys());
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIds);

    if (!questions) {
      setLoading(false);
      return;
    }

    // Combine
    const combined: QuestionWithPrediction[] = questions.map((q) => {
      const preds = questionMap.get(q.id) || [];
      return {
        question: q,
        latestPrediction: preds[0],
        predictionCount: preds.length,
      };
    });

    setQuestionPredictions(combined);

    // Calculate stats
    const totalPreds = predictions.length;
    const uniqueQuestions = questionIds.length;
    const scoredPreds = predictions.filter((p) => p.brier_score !== null);
    const avgBrier =
      scoredPreds.length > 0
        ? scoredPreds.reduce((sum, p) => sum + (p.brier_score || 0), 0) / scoredPreds.length
        : null;

    setStats({
      totalPredictions: totalPreds,
      questionsCount: uniqueQuestions,
      avgBrierScore: avgBrier,
    });

    setLoading(false);
  };

  const filteredPredictions = questionPredictions.filter((qp) => {
    if (filter === 'active') {
      return qp.question.resolution_status === 'pending' && new Date(qp.question.close_date) > new Date();
    }
    if (filter === 'resolved') {
      return qp.question.resolution_status !== 'pending';
    }
    return true;
  });

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-arctic/10 to-lavender/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Moje predykcje</h1>
            <p className="text-muted-foreground text-lg">
              Twoja historia prognoz i wyniki
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalPredictions}</div>
                    <div className="text-sm text-muted-foreground">Wszystkie predykcje</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{stats.questionsCount}</div>
                    <div className="text-sm text-muted-foreground">Pytania</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.avgBrierScore !== null ? stats.avgBrierScore.toFixed(3) : '—'}
                    </div>
                    <div className="text-sm text-muted-foreground">Śr. Brier Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter tabs */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Wszystkie</TabsTrigger>
                  <TabsTrigger value="active">Aktywne</TabsTrigger>
                  <TabsTrigger value="resolved">Rozstrzygnięte</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Predictions list */}
          <Card>
            <CardHeader>
              <CardTitle>Twoje prognozy ({filteredPredictions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPredictions.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {filter === 'active' && 'Brak aktywnych predykcji'}
                    {filter === 'resolved' && 'Brak rozstrzygniętych predykcji'}
                    {filter === 'all' && 'Nie masz jeszcze żadnych predykcji. Zacznij przewidywać!'}
                  </p>
                  {filter === 'all' && (
                    <Link
                      to="/questions"
                      className="mt-4 inline-block text-primary hover:underline"
                    >
                      Przejdź do pytań →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPredictions.map(({ question, latestPrediction, predictionCount }) => {
                    const isResolved = question.resolution_status !== 'pending';
                    const isExpired = new Date(question.close_date) < new Date();

                    return (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Link
                            to="/questions"
                            className="font-semibold hover:underline flex-1"
                          >
                            {question.title}
                          </Link>
                          <div className="flex items-center gap-2 ml-2">
                            {question.category && (
                              <Badge variant="secondary" className="text-xs">
                                {question.category}
                              </Badge>
                            )}
                            {isResolved ? (
                              <Badge
                                variant={question.resolution_status === 'yes' ? 'default' : 'secondary'}
                                className={
                                  question.resolution_status === 'yes'
                                    ? 'bg-green-600'
                                    : 'bg-red-600'
                                }
                              >
                                {question.resolution_status === 'yes' ? (
                                  <><CheckCircle className="w-3 h-3 mr-1" /> TAK</>
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" /> NIE</>
                                )}
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-600">
                                <Clock className="w-3 h-3 mr-1" />
                                Zamknięte
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="font-semibold text-primary text-lg">
                            {latestPrediction.probability}%
                          </span>
                          {predictionCount > 1 && (
                            <span className="text-muted-foreground">
                              {predictionCount} {predictionCount === 1 ? 'aktualizacja' : 'aktualizacji'}
                            </span>
                          )}
                          {isResolved && latestPrediction.brier_score !== null && (
                            <>
                              <span className="text-muted-foreground">
                                Brier: <strong>{latestPrediction.brier_score.toFixed(3)}</strong>
                              </span>
                              {latestPrediction.time_weighted_score !== null && (
                                <span className="text-muted-foreground text-xs">
                                  Ważony czasem: {latestPrediction.time_weighted_score.toFixed(3)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {latestPrediction.reasoning && (
                          <p className="text-sm text-muted-foreground italic">
                            "{latestPrediction.reasoning}"
                          </p>
                        )}

                        <div className="text-xs text-muted-foreground mt-2">
                          Ostatnia aktualizacja:{' '}
                          {format(new Date(latestPrediction.created_at), 'd MMMM yyyy, HH:mm', {
                            locale: pl,
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
