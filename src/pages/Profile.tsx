import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, TrendingUp, Target, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Prediction, Question, Profile as ProfileType } from '@/types';

interface QuestionWithPredictions {
  question: Question;
  predictions: Prediction[];
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [questionPredictions, setQuestionPredictions] = useState<QuestionWithPredictions[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPredictions: 0,
    questionsCount: 0,
    avgBrierScore: null as number | null,
  });

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadPredictions();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  const loadPredictions = async () => {
    if (!userId) return;

    // Fetch all predictions for this user
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*, profiles(email, display_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !predictions) {
      setLoading(false);
      return;
    }

    // Group by question
    const questionMap = new Map<string, Prediction[]>();
    for (const pred of predictions) {
      const qid = pred.question_id;
      if (!questionMap.has(qid)) {
        questionMap.set(qid, []);
      }
      questionMap.get(qid)!.push(pred);
    }

    // Fetch question details
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
    const combined: QuestionWithPredictions[] = questions.map((q) => ({
      question: q,
      predictions: questionMap.get(q.id) || [],
    }));

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

  const isOwnProfile = currentUser?.id === userId;

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Profil nie znaleziony</h1>
            <Button asChild>
              <Link to="/questions">Powrót do pytań</Link>
            </Button>
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
          {/* Profile Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {profile.display_name || profile.email}
                      {isOwnProfile && <span className="text-primary ml-2">(Ty)</span>}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Użytkownik od {format(new Date(profile.created_at), 'd MMMM yyyy', { locale: pl })}
                    </p>
                  </div>
                </div>
                {isOwnProfile && (
                  <Button variant="outline" asChild>
                    <Link to="/edit-profile">Edytuj profil</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalPredictions}</div>
                    <div className="text-sm text-muted-foreground">Predykcje</div>
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

          {/* Predictions by Question */}
          <Card>
            <CardHeader>
              <CardTitle>Historia predykcji</CardTitle>
            </CardHeader>
            <CardContent>
              {questionPredictions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Brak predykcji
                </p>
              ) : (
                <div className="space-y-4">
                  {questionPredictions.map(({ question, predictions }) => {
                    const latest = predictions[0];
                    const isResolved = question.resolution_status !== 'pending';

                    return (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Link
                            to="/questions"
                            className="font-semibold hover:underline flex-1"
                          >
                            {question.title}
                          </Link>
                          {question.category && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              {question.category}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-primary">
                            Najnowsza: {latest.probability}%
                          </span>
                          {predictions.length > 1 && (
                            <span className="text-muted-foreground">
                              {predictions.length} {predictions.length === 1 ? 'aktualizacja' : 'aktualizacji'}
                            </span>
                          )}
                          {isResolved && latest.brier_score !== null && (
                            <span className="text-muted-foreground">
                              Brier: {latest.brier_score.toFixed(3)}
                            </span>
                          )}
                          {isResolved && (
                            <Badge variant={question.resolution_status === 'yes' ? 'default' : 'secondary'}>
                              {question.resolution_status === 'yes' ? 'TAK' : 'NIE'}
                            </Badge>
                          )}
                        </div>

                        {latest.reasoning && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {latest.reasoning}
                          </p>
                        )}
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
