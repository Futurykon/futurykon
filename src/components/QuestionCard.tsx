import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { DatePicker } from '@/components/ui/date-picker';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import { AdminOnly } from '@/components/AdminOnly';
import { PredictionThread } from '@/components/PredictionThread';
import { PredictionHistoryChart } from '@/components/PredictionHistoryChart';
import { Calendar, Clock, Users, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { isQuestionExpired } from '@/lib/predictions';
import { useToast } from '@/hooks/use-toast';
import { createPrediction } from '@/services/predictions';
import { editQuestion as editQ, resolveQuestion as resolveQ, deleteQuestion as deleteQ } from '@/services/questions';
import type { Question, Prediction, CommunityPrediction } from '@/types';
import type { Category } from '@/services/categories';

interface QuestionCardProps {
  question: Question;
  userPrediction: Prediction | undefined;
  allPredictions: Prediction[];
  communityPrediction: CommunityPrediction | undefined;
  currentUserId: string | undefined;
  categories: Category[];
  onRefetch: () => void;
}

export function QuestionCard({
  question,
  userPrediction,
  allPredictions,
  communityPrediction,
  currentUserId,
  categories,
  onRefetch,
}: QuestionCardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPredictForm, setShowPredictForm] = useState(false);
  const [probability, setProbability] = useState([userPrediction?.probability ?? 50]);
  const [reasoning, setReasoning] = useState(userPrediction?.reasoning ?? '');

  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editTitle, setEditTitle] = useState(question.title);
  const [editDescription, setEditDescription] = useState(question.description || '');
  const [editCriteria, setEditCriteria] = useState(question.resolution_criteria || '');
  const [editCloseDate, setEditCloseDate] = useState<Date | undefined>(
    question.close_date ? new Date(question.close_date) : undefined,
  );
  const [editTags, setEditTags] = useState<string[]>(question.tags || []);

  const expired = isQuestionExpired(question.close_date);

  const openPredictForm = () => {
    setProbability([userPrediction?.probability ?? 50]);
    setReasoning(userPrediction?.reasoning ?? '');
    setShowPredictForm(true);
  };

  const submitPrediction = async () => {
    if (!currentUserId) return;
    setIsSubmitting(true);
    const { error } = await createPrediction({
      question_id: question.id,
      user_id: currentUserId,
      probability: Math.round(probability[0]),
      reasoning,
    });
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać predykcji.', variant: 'destructive' });
    } else {
      toast({ title: 'Sukces', description: 'Predykcja została zapisana!' });
      setShowPredictForm(false);
      onRefetch();
    }
    setIsSubmitting(false);
  };

  const saveEdit = async () => {
    if (!editTitle || !editCloseDate) {
      toast({ title: 'Błąd', description: 'Tytuł i data zamknięcia są wymagane.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await editQ(question.id, {
      title: editTitle,
      description: editDescription,
      resolution_criteria: editCriteria,
      close_date: editCloseDate.toISOString(),
      tags: editTags,
    });
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować pytania.', variant: 'destructive' });
    } else {
      toast({ title: 'Sukces', description: 'Pytanie zostało zaktualizowane!' });
      setEditingQuestion(false);
      onRefetch();
    }
    setIsSubmitting(false);
  };

  const resolveQuestion = async (outcome: 'yes' | 'no') => {
    setIsSubmitting(true);
    const { error } = await resolveQ(question.id, outcome);
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się rozstrzygnąć pytania.', variant: 'destructive' });
    } else {
      toast({ title: 'Sukces', description: `Pytanie rozstrzygnięte jako ${outcome === 'yes' ? 'TAK' : 'NIE'}!` });
      onRefetch();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć to pytanie? Ta operacja jest nieodwracalna.')) return;
    setIsSubmitting(true);
    const { error } = await deleteQ(question.id);
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć pytania.', variant: 'destructive' });
    } else {
      toast({ title: 'Sukces', description: 'Pytanie zostało usunięte!' });
      onRefetch();
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">{question.title}</CardTitle>
              {(question.tags || []).map((tag) => {
                const color = categories.find((c) => c.name === tag)?.color;
                return (
                  <Badge
                    key={tag}
                    className="text-xs border-0 text-white"
                    style={color ? { backgroundColor: color } : undefined}
                    variant={color ? undefined : 'secondary'}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
            <CardDescription className="text-base">{question.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(question.close_date), 'd MMMM yyyy', { locale: pl })}</span>
              </div>
              {expired && (
                <div className="flex items-center gap-1 text-destructive">
                  <Clock className="w-4 h-4" />
                  <span>Zakończone</span>
                </div>
              )}
            </div>
            <AdminOnly>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(true)} disabled={isSubmitting}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </AdminOnly>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Edit form */}
        {editingQuestion && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg space-y-4">
            <h4 className="font-semibold">Edytuj pytanie</h4>
            <div className="space-y-2">
              <Label>Tytuł</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Kryteria rozstrzygnięcia</Label>
              <Textarea value={editCriteria} onChange={(e) => setEditCriteria(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Tagi</Label>
              <TagMultiSelect categories={categories} value={editTags} onChange={setEditTags} placeholder="Wybierz tagi..." />
            </div>
            <div className="space-y-2">
              <Label>Data zamknięcia</Label>
              <DatePicker date={editCloseDate} onDateChange={setEditCloseDate} disabled={(d) => d < new Date()} placeholder="Wybierz datę" />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={isSubmitting}>Zapisz zmiany</Button>
              <Button variant="outline" onClick={() => setEditingQuestion(false)} disabled={isSubmitting}>Anuluj</Button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-medium mb-2">Kryteria rozstrzygnięcia:</h4>
          <p className="text-sm text-muted-foreground">{question.resolution_criteria}</p>
        </div>

        {/* Resolution status */}
        {question.resolution_status !== 'pending' && (
          <div className={`mb-4 p-4 rounded-lg border-2 ${question.resolution_status === 'yes' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <div className="flex items-center gap-2">
              {question.resolution_status === 'yes' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <div className={`font-bold text-lg ${question.resolution_status === 'yes' ? 'text-green-700' : 'text-red-700'}`}>
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

        {/* Admin resolution panel */}
        {question.resolution_status === 'pending' && (
          <AdminOnly>
            <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <h4 className="font-medium mb-3 text-amber-900">Rozstrzygnij pytanie (admin):</h4>
              <div className="flex gap-2">
                <Button onClick={() => resolveQuestion('yes')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Rozstrzygnij jako TAK
                </Button>
                <Button onClick={() => resolveQuestion('no')} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
                  <XCircle className="w-4 h-4 mr-2" /> Rozstrzygnij jako NIE
                </Button>
              </div>
            </div>
          </AdminOnly>
        )}

        {/* Community prediction + chart */}
        {communityPrediction && communityPrediction.prediction_count > 0 && (
          <div className="mb-4 bg-magenta/5 border border-magenta/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <div className="font-semibold text-lg">
                  Predykcja społeczności: {communityPrediction.community_probability?.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Na podstawie {communityPrediction.prediction_count} predykcji
                  {' • '}
                  Wszystkich predykcji: {allPredictions.length}
                </div>
              </div>
            </div>
            {allPredictions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-magenta/20">
                <h4 className="text-sm font-medium mb-3">Historia predykcji</h4>
                <PredictionHistoryChart predictions={allPredictions} questionTitle={question.title} />
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Obliczona przy użyciu geometrycznej średniej szans (geometric mean of odds)
            </div>
          </div>
        )}

        {/* Prediction form / action */}
        {showPredictForm ? (
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor={`prob-${question.id}`} className="text-base font-medium">
                Prawdopodobieństwo: {Math.round(probability[0])}%
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`prob-${question.id}`}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={0}
                  max={100}
                  value={Number.isFinite(probability[0]) ? Math.round(probability[0]) : 0}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    setProbability([isNaN(num) ? 0 : Math.max(0, Math.min(100, num))]);
                  }}
                  className="w-32"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={probability}
                onValueChange={(vals) => setProbability([Math.round(Array.isArray(vals) ? vals[0] : Number(vals))])}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor={`reason-${question.id}`}>Uzasadnienie (opcjonalne)</Label>
              <Textarea
                id={`reason-${question.id}`}
                placeholder="Dlaczego uważasz, że to prawdopodobieństwo jest poprawne?"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={submitPrediction} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Zapisywanie...' : userPrediction ? 'Zaktualizuj predykcję' : 'Zapisz predykcję'}
              </Button>
              <Button variant="outline" onClick={() => setShowPredictForm(false)} disabled={isSubmitting}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : !expired ? (
          <div className="mb-4">
            {currentUserId ? (
              <Button variant={userPrediction ? 'outline' : 'default'} size="sm" onClick={openPredictForm}>
                {userPrediction ? 'Zaktualizuj predykcję' : 'Dodaj predykcję'}
              </Button>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-muted-foreground mb-2">Zaloguj się, aby dodać swoją predykcję</p>
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

        {allPredictions.length > 0 && (
          <PredictionThread predictions={allPredictions} currentUserId={currentUserId} />
        )}
      </CardContent>
    </Card>
  );
}
