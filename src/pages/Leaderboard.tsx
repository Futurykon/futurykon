import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeaderboard } from '@/services/predictions';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Target } from 'lucide-react';
import { mapLeaderboardRow, type LeaderboardEntry } from '@/lib/leaderboard';

const MIN_QUESTIONS = 5;

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    // The full ranking rule (avg log score, 5-distinct-questions threshold,
    // descending sort) lives in the `leaderboard` DB view — this is a thin read.
    const { data, error } = await getLeaderboard();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setEntries(data.map(mapLeaderboardRow));
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
              Najlepsi przewidywacze przyszłości AI, uszeregowani według średniego Log Score (wyższy = lepszy)
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tabela liderów</CardTitle>
              <CardDescription>
                Tylko użytkownicy z przynajmniej {MIN_QUESTIONS} pytaniami i co najmniej jedną ocenioną predykcją
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
                      <TableHead className="text-right">Śr. Log Score</TableHead>
                      <TableHead className="text-right">Ocenione pytania</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => {
                      const rank = index + 1;
                      let badge = null;
                      if (rank === 1) badge = <Badge className="bg-yellow-500">🥇 1</Badge>;
                      else if (rank === 2) badge = <Badge className="bg-gray-400">🥈 2</Badge>;
                      else if (rank === 3) badge = <Badge className="bg-orange-600">🥉 3</Badge>;

                      return (
                        <TableRow key={entry.user_id}>
                          <TableCell className="font-medium">{badge || rank}</TableCell>
                          <TableCell>
                            <Link to={`/profile/${entry.user_id}`} className="hover:underline font-medium">
                              {entry.display_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.avg_log_score.toFixed(3)}
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

          <Card className="mt-6 bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                O Log Score
              </h3>
              <p className="text-sm text-muted-foreground">
                Log Score to właściwa miara dokładności prognoz probabilistycznych (model Metaculus).
                Każdy przedział, przez który utrzymujesz daną prognozę, jest oceniany proporcjonalnie
                do czasu jego trwania. Formuła: y·ln(p) + (1−y)·ln(1−p), gdzie p to Twoja prognoza (0–1),
                a y to wynik (0 lub 1). Wyższy (mniej ujemny) wynik = lepsza prognoza.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
