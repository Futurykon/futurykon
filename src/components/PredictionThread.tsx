import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isThisYear } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { Prediction, UserPredictionGroup } from '@/types';

function formatPredictionDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isThisYear(date)) return format(date, 'd MMM', { locale: pl });
  return format(date, 'd MMM yyyy', { locale: pl });
}

function groupPredictionsByUser(preds: Prediction[]): UserPredictionGroup[] {
  const map = new Map<string, Prediction[]>();
  // preds are already sorted newest-first from the fetch
  for (const p of preds) {
    const arr = map.get(p.user_id);
    if (arr) arr.push(p);
    else map.set(p.user_id, [p]);
  }
  const groups: UserPredictionGroup[] = [];
  for (const [userId, userPreds] of map) {
    const latest = userPreds[0];
    groups.push({
      user_id: userId,
      user_email: latest.profiles?.email || latest.user_email,
      user_display_name: latest.profiles?.display_name || latest.user_display_name,
      latest: latest,
      history: userPreds.slice(1),
    });
  }
  // Sort groups by latest prediction date, newest first
  groups.sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
  return groups;
}

interface PredictionThreadProps {
  predictions: Prediction[];
  currentUserId?: string;
  showUserLinks?: boolean;
}

export function PredictionThread({ predictions, currentUserId, showUserLinks = true }: PredictionThreadProps) {
  const groups = groupPredictionsByUser(predictions);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const uniqueUserCount = groups.length;

  const toggleExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const getUserDisplayName = (group: UserPredictionGroup) => {
    return group.user_display_name || group.user_email || 'Anonim';
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">
          Predykcje ({predictions.length} od {uniqueUserCount} {uniqueUserCount === 1 ? 'użytkownika' : 'użytkowników'})
        </h4>
      </div>
      <div className="space-y-3">
        {groups.map((group) => {
          const isOwn = currentUserId === group.user_id;
          const isExpanded = expandedUsers.has(group.user_id);
          const hasHistory = group.history.length > 0;
          const displayName = getUserDisplayName(group);

          return (
            <div
              key={group.user_id}
              className={`p-3 rounded-lg text-sm ${isOwn ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}
            >
              {/* Latest prediction */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {showUserLinks ? (
                    <Link to={`/profile/${group.user_id}`} className="font-medium hover:underline">
                      {displayName}
                      {isOwn && <span className="text-primary ml-1">(Ty)</span>}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {displayName}
                      {isOwn && <span className="text-primary ml-1">(Ty)</span>}
                    </span>
                  )}
                  <span className="font-semibold text-primary">{group.latest.probability}%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatPredictionDate(group.latest.created_at)}
                </span>
              </div>
              {group.latest.reasoning && (
                <p className="text-muted-foreground mt-1">{group.latest.reasoning}</p>
              )}

              {/* Expandable history */}
              {hasHistory && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleExpand(group.user_id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {group.history.length} wcześniejsz{group.history.length === 1 ? 'a aktualizacja' : 'ych aktualizacji'}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
                      {group.history.map((pred) => (
                        <div key={pred.id} className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pred.probability}%</span>
                            <span>{formatPredictionDate(pred.created_at)}</span>
                          </div>
                          {pred.reasoning && (
                            <p className="mt-0.5">{pred.reasoning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
