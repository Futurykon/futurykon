import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Key, RefreshCw, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getApiKey, generateApiKey, deleteApiKey } from '@/services/apiKeys';

export default function DeveloperSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyCreatedAt, setKeyCreatedAt] = useState<string | null>(null);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadKeyStatus();
  }, [user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadKeyStatus = async () => {
    if (!user) return;
    const { data } = await getApiKey(user.id);
    setKeyCreatedAt(data?.created_at ?? null);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!user) return;
    setSaving(true);
    setNewlyGeneratedKey(null);

    const { rawKey, error } = await generateApiKey(user.id);
    if (error || !rawKey) {
      toast({ title: 'Błąd', description: 'Nie udało się wygenerować klucza.', variant: 'destructive' });
    } else {
      setNewlyGeneratedKey(rawKey);
      setKeyCreatedAt(new Date().toISOString());
      toast({ title: 'Klucz wygenerowany', description: 'Skopiuj klucz — nie zostanie pokazany ponownie.' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm('Czy na pewno chcesz usunąć klucz API? Wszystkie integracje używające tego klucza przestaną działać.')) return;
    setSaving(true);
    const { error } = await deleteApiKey(user.id);
    if (error) {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć klucza.', variant: 'destructive' });
    } else {
      setKeyCreatedAt(null);
      setNewlyGeneratedKey(null);
      toast({ title: 'Klucz usunięty' });
    }
    setSaving(false);
  };

  const copyKey = () => {
    if (!newlyGeneratedKey) return;
    navigator.clipboard.writeText(newlyGeneratedKey);
    toast({ title: 'Skopiowano do schowka' });
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
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Key className="w-7 h-7 text-primary" />
              Ustawienia dewelopera
            </h1>
            <p className="text-muted-foreground">
              Klucz API umożliwia agentom AI (np. Claude) korzystanie z Futurykon przez MCP.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Klucz API</CardTitle>
              <CardDescription>
                Jeden klucz na konto. Wygenerowanie nowego klucza unieważnia poprzedni.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Newly generated key — show once */}
              {newlyGeneratedKey && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Zapisz ten klucz — nie zostanie pokazany ponownie
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={newlyGeneratedKey}
                      className="font-mono text-sm bg-white"
                    />
                    <Button variant="outline" size="sm" onClick={copyKey}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-700">
                    Użyj tego klucza w konfiguracji MCP: <code>npx futurykon-mcp --api-key={"<klucz>"}</code>
                  </p>
                </div>
              )}

              {/* Key status */}
              {keyCreatedAt && !newlyGeneratedKey && (
                <div className="p-4 bg-muted/40 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Aktywny klucz wygenerowany:{' '}
                    <span className="font-medium text-foreground">
                      {format(new Date(keyCreatedAt), 'd MMMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </p>
                </div>
              )}

              {!keyCreatedAt && !newlyGeneratedKey && (
                <p className="text-sm text-muted-foreground">Brak aktywnego klucza API.</p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={saving}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {keyCreatedAt ? 'Wygeneruj nowy klucz' : 'Wygeneruj klucz'}
                </Button>
                {keyCreatedAt && (
                  <Button variant="outline" onClick={handleDelete} disabled={saving} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Usuń klucz
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Jak używać z Claude Desktop</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Dodaj do pliku konfiguracyjnego Claude Desktop (<code>claude_desktop_config.json</code>):
              </p>
              <pre className="text-xs bg-background border rounded p-3 overflow-x-auto">{`{
  "mcpServers": {
    "futurykon": {
      "command": "npx",
      "args": ["futurykon-mcp"],
      "env": {
        "FUTURYKON_API_KEY": "<twój klucz>"
      }
    }
  }
}`}</pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
