import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAdmin } from '@/hooks/useAdmin';
import { useCategories } from '@/hooks/useCategories';
import { createCategory, updateCategory, deleteCategory, type Category } from '@/services/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShieldX, Plus, Trash2, Save } from 'lucide-react';

interface RowState {
  name: string;
  color: string;
}

export default function AdminCategories() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { categories, loading, reload } = useCategories();
  const { toast } = useToast();

  // Per-row edit state: id → { name, color }
  const [edits, setEdits] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [adding, setAdding] = useState(false);

  // Initialise edits when categories load
  useEffect(() => {
    const initial: Record<string, RowState> = {};
    for (const c of categories) {
      initial[c.id] = { name: c.name, color: c.color };
    }
    setEdits(initial);
  }, [categories]);

  const setField = (id: string, field: keyof RowState, value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const isDirty = (cat: Category) => {
    const e = edits[cat.id];
    return e && (e.name !== cat.name || e.color !== cat.color);
  };

  const handleSave = async (cat: Category) => {
    const e = edits[cat.id];
    if (!e || !e.name.trim()) return;
    setSaving((s) => ({ ...s, [cat.id]: true }));
    const { error } = await updateCategory(cat.id, { name: e.name.trim(), color: e.color }, cat.name);
    setSaving((s) => ({ ...s, [cat.id]: false }));
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać kategorii.', variant: 'destructive' });
    } else {
      toast({ title: 'Zapisano' });
      reload();
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Usuń kategorię "${cat.name}"? Pytania z tą kategorią zachowają jej nazwę.`)) return;
    const { error } = await deleteCategory(cat.id);
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć kategorii.', variant: 'destructive' });
    } else {
      toast({ title: 'Usunięto', description: cat.name });
      reload();
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1;
    const { error } = await createCategory({ name: newName.trim(), color: newColor, sort_order: nextOrder });
    setAdding(false);
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się dodać kategorii.', variant: 'destructive' });
    } else {
      toast({ title: 'Dodano', description: newName.trim() });
      setNewName('');
      setNewColor('#6b7280');
      reload();
    }
  };

  if (adminLoading || loading) {
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <Card>
              <CardContent className="pt-6">
                <ShieldX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
                <p className="text-muted-foreground mb-4">Ta strona jest dostępna tylko dla administratorów.</p>
                <Button asChild><Link to="/questions">Powrót</Link></Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-arctic/10 to-lavender/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1">Zarządzanie kategoriami</h1>
            <p className="text-muted-foreground">Dodaj, zmień nazwę lub kolor kategorii pytań.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kategorie ({categories.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((cat) => {
                const e = edits[cat.id] ?? { name: cat.name, color: cat.color };
                const dirty = isDirty(cat);
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    {/* Color picker */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden"
                        style={{ backgroundColor: e.color }}
                      >
                        <input
                          type="color"
                          value={e.color}
                          onChange={(ev) => setField(cat.id, 'color', ev.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Wybierz kolor"
                        />
                      </div>
                    </div>

                    {/* Name input */}
                    <Input
                      value={e.name}
                      onChange={(ev) => setField(cat.id, 'name', ev.target.value)}
                      className="flex-1"
                      onKeyDown={(ev) => ev.key === 'Enter' && dirty && handleSave(cat)}
                    />

                    {/* Save */}
                    <Button
                      size="sm"
                      disabled={!dirty || saving[cat.id]}
                      onClick={() => handleSave(cat)}
                      className="gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {saving[cat.id] ? '...' : 'Zapisz'}
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(cat)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Brak kategorii</p>
              )}
            </CardContent>
          </Card>

          {/* Add new */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Dodaj kategorię</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden"
                    style={{ backgroundColor: newColor }}
                  >
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Wybierz kolor"
                    />
                  </div>
                </div>
                <Input
                  placeholder="Nazwa kategorii"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} disabled={!newName.trim() || adding} className="gap-1 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                  {adding ? '...' : 'Dodaj'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
