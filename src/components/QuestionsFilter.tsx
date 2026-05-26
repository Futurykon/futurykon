import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';
import type { Category } from '@/services/categories';

interface QuestionsFilterProps {
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  sortBy: string;
  categories: Category[];
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSortChange: (v: string) => void;
}

export function QuestionsFilter({
  searchQuery,
  categoryFilter,
  statusFilter,
  sortBy,
  categories,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onSortChange,
}: QuestionsFilterProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj pytań..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <Tabs value={statusFilter} onValueChange={onStatusChange} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">Wszystkie</TabsTrigger>
                <TabsTrigger value="active">Aktywne</TabsTrigger>
                <TabsTrigger value="resolved">Rozstrzygnięte</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sortuj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Najnowsze</SelectItem>
                <SelectItem value="closing">Zamykane wkrótce</SelectItem>
                <SelectItem value="predictions">Najwięcej predykcji</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
