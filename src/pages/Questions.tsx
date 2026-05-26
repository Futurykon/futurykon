import { useState, useEffect, useCallback } from 'react';
import { getQuestions } from '@/services/questions';
import { getAllPredictions } from '@/services/predictions';
import { getCommunityPredictions } from '@/services/communityPredictions';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { Header } from '@/components/Header';
import { QuestionsFilter } from '@/components/QuestionsFilter';
import { QuestionCard } from '@/components/QuestionCard';
import { isQuestionExpired } from '@/lib/predictions';
import type { Question, Prediction, CommunityPrediction } from '@/types';

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction[]>>({});
  const [communityPredictions, setCommunityPredictions] = useState<Record<string, CommunityPrediction>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const { user } = useAuth();
  const { categories } = useCategories();

  const fetchAll = useCallback(async () => {
    const [qRes, pRes, cpRes] = await Promise.all([
      getQuestions(),
      getAllPredictions(),
      getCommunityPredictions(),
    ]);

    if (qRes.data) setQuestions(qRes.data);

    if (pRes.data) {
      const map: Record<string, Prediction[]> = {};
      for (const row of pRes.data) {
        const p: Prediction = {
          id: row.id,
          question_id: row.question_id,
          user_id: row.user_id,
          probability: row.probability,
          reasoning: row.reasoning,
          created_at: row.created_at,
          profiles: (row as { profiles?: { email?: string; display_name?: string } }).profiles,
        };
        if (!map[p.question_id]) map[p.question_id] = [];
        map[p.question_id].push(p);
      }
      setPredictions(map);
    }

    if (cpRes.data) {
      const map: Record<string, CommunityPrediction> = {};
      for (const cp of cpRes.data) map[cp.question_id] = cp;
      setCommunityPredictions(map);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredQuestions = questions
    .filter((q) => {
      if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== 'all' && !(q.tags || []).includes(categoryFilter)) return false;
      if (statusFilter === 'active' && (q.resolution_status !== 'pending' || isQuestionExpired(q.close_date))) return false;
      if (statusFilter === 'resolved' && q.resolution_status === 'pending') return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'closing': return new Date(a.close_date).getTime() - new Date(b.close_date).getTime();
        case 'predictions': {
          const aCount = communityPredictions[a.id]?.prediction_count || 0;
          const bCount = communityPredictions[b.id]?.prediction_count || 0;
          return bCount - aCount;
        }
        default: return 0;
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

        <QuestionsFilter
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          sortBy={sortBy}
          categories={categories}
          onSearchChange={setSearchQuery}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          onSortChange={setSortBy}
        />

        <div className="grid gap-6">
          {filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              userPrediction={predictions[question.id]?.find((p) => p.user_id === user?.id)}
              allPredictions={predictions[question.id] || []}
              communityPrediction={communityPredictions[question.id]}
              currentUserId={user?.id}
              categories={categories}
              onRefetch={fetchAll}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
