import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Target } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  email: string;
  display_name: string | null;
  avg_brier: number;
  scored_count: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    // Query predictions with Brier scores, join with profiles
    const { data, error } = await supabase
      .from('predictions')
      .select('user_id, brier_score, profiles(email, display_name)')
      .not('brier_score', 'is', null);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Group by user and calculate average
    const userMap = new Map<string, { scores: number[]; profile: any }>();

    for (const row of data) {
      const userId = row.user_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          scores: [],
          profile: row.profiles,
        });
      }
      if (row.brier_score !== null) {
        userMap.get(userId)!.scores.push(row.brier_score);
      }
    }

    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = [];
    for (const [userId, { scores, profile }] of userMap) {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      leaderboard.push({
        user_id: userId,
        email: profile?.email || 'Nieznany',
        display_name: profile?.display_name || null,
        avg_brier: avg,
        scored_count: scores.length,
      });
    }

    // Sort by avg_brier (lower is better)
    leaderboard.sort((a, b) => a.avg_brier - b.avg_brier);

    setEntries(leaderboard);
    setLoading(false);
  };

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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-500" />
              Ranking prognostyków
            </h1>
            <p className="text-muted-foreground text-lg">
              Najlepsi przewidywacze przyszłości AI, uszeregowani według średniego Brier Score (niższy = lepszy)
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tabela liderów</CardTitle>
              <CardDescription>
                Tylko użytkownicy z przynajmniej jedną ocenioną predykcją
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Brak ocenionych predykcji. Wróć, gdy pierwsze pytania zostaną rozstrzygnięte!
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Miejsce</TableHead>
                      <TableHead>Użytkownik</TableHead>
                      <TableHead className="text-right">Śr. Brier Score</TableHead>
                      <TableHead className="text-right">Ocenione predykcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => {
                      const rank = index + 1;
                      let badge = null;
                      if (rank === 1) {
                        badge = <Badge className="bg-yellow-500">🥇 1</Badge>;
                      } else if (rank === 2) {
                        badge = <Badge className="bg-gray-400">🥈 2</Badge>;
                      } else if (rank === 3) {
                        badge = <Badge className="bg-orange-600">🥉 3</Badge>;
                      }

                      return (
                        <TableRow key={entry.user_id}>
                          <TableCell className="font-medium">
                            {badge || rank}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/profile/${entry.user_id}`}
                              className="hover:underline font-medium"
                            >
                              {entry.display_name || entry.email}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.avg_brier.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {entry.scored_count}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="mt-6 bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                O Brier Score
              </h3>
              <p className="text-sm text-muted-foreground">
                Brier Score to miara dokładności prognoz probabilistycznych. Wynik 0 oznacza
                idealną prognozę, a 1 oznacza najgorszy możliwy wynik. Formuła: (p - wynik)²,
                gdzie p to Twoja prognoza (0-1), a wynik to 0 lub 1.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
