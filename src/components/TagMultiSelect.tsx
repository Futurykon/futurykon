import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/hooks/useCategories';

interface TagMultiSelectProps {
  categories: Category[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagMultiSelect({
  categories,
  value,
  onChange,
  placeholder = 'Wybierz tagi...',
  className,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  };

  const remove = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== name));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
          className={cn(
            'flex flex-wrap gap-1 min-h-10 w-full border border-input rounded-md px-3 py-2 cursor-pointer bg-background text-sm',
            'hover:border-ring transition-colors',
            className,
          )}
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground self-center">{placeholder}</span>
          ) : (
            value.map((name) => {
              const color = categories.find((c) => c.name === name)?.color ?? '#6b7280';
              return (
                <span
                  key={name}
                  className="flex items-center gap-1 text-xs text-white rounded-full px-2 py-0.5"
                  style={{ backgroundColor: color }}
                >
                  {name}
                  <button
                    type="button"
                    onClick={(e) => remove(name, e)}
                    className="hover:opacity-70 leading-none"
                    aria-label={`Usuń ${name}`}
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
          <ChevronDown className="ml-auto w-4 h-4 self-center text-muted-foreground flex-shrink-0" />
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-1" align="start">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.name)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-sm text-sm hover:bg-muted"
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="flex-1 text-left">{cat.name}</span>
            {value.includes(cat.name) && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground px-3 py-2">Brak kategorii</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
