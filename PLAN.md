# Plan: Make Futurykon multi-user ready

## Context
Futurykon is a functional prediction market but lacks features for a community of 10-50 users. No way to see track records, compare forecasters, filter questions, suggest questions, or manage content. This plan adds the minimum feature set for a real multi-user platform.

## Scope
9 features in priority order. Each includes DB migration (if needed) + UI changes.

---

## Phase A — Top priority (admin tooling & core fixes)

### A1. Fix prediction history visibility
**Why**: Collapsible prediction history exists in code (`PredictionThread` in Questions.tsx) but may not be working. Most likely the `20250207000000_prediction_history.sql` migration wasn't pushed to production, so the UNIQUE constraint on `(question_id, user_id)` still exists and duplicate inserts silently fail.

**Steps**:
1. Verify migration was applied: `npx supabase db push`
2. Test by making 2 predictions on the same question — second should create a new row, and collapsible history should appear
3. If it works, no code changes needed — this is a deployment issue

---

### A2. Admin: edit & delete questions
**Why**: Admins need to fix typos, update criteria, and remove bad questions.

**DB migration** (`supabase/migrations/20250208000000_admin_delete_questions.sql`):
```sql
-- Allow admins to delete questions
CREATE POLICY "Only admins can delete questions"
ON public.questions FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
```
(INSERT/UPDATE policies for admins already exist in initial migration.)

**Files to modify**:
- `src/pages/Questions.tsx` — Add admin controls to each question card:
  - "Edytuj" button → opens inline edit form (title, description, criteria, close date, category)
  - "Usuń" button → confirmation dialog, then deletes question
  - Only visible to admins (reuse existing `isAdmin` state)

---

### A3. Display names & profile editing
**Why**: Users need identity beyond email. Admins need to manage their profile.

**DB migration** (`supabase/migrations/20250208000001_display_name.sql`):
```sql
ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
```

**New files**:
- `src/pages/EditProfile.tsx` — Protected page with form to set display_name

**Files to modify**:
- `src/pages/Questions.tsx` — In PredictionThread, show `display_name` instead of email (fall back to email if null). Fetch display_name via the existing profiles join.
- `src/components/Header.tsx` — Show display_name instead of email when logged in. Add link to `/edit-profile`.
- `src/App.tsx` — Add `/edit-profile` route (protected)

---

## Phase B — Content organization

### B1. Add `category` column & persist it
**Why**: Category is collected in UI but silently dropped on save.

**DB migration** (`supabase/migrations/20250208000002_add_category.sql`):
```sql
ALTER TABLE public.questions ADD COLUMN category TEXT;
```

**New files**:
- `src/lib/categories.ts` — Shared categories constant used by AskQuestion, Suggest, and Questions filter

**Files to modify**:
- `src/pages/AskQuestion.tsx` — Add `category` to the `.insert()` call (line 68-74)
- `src/pages/Questions.tsx` — Display category badge on each question card

---

### B2. Question filtering & search
**Why**: With 10+ questions, users need to find relevant ones.

**Files to modify**:
- `src/pages/Questions.tsx` — Add filter bar above question grid:
  - Text search (client-side title filter)
  - Category dropdown (from shared categories)
  - Status tabs: Wszystkie / Aktywne / Rozstrzygnięte
  - Sort: Najnowsze / Zamykane wkrótce / Najwięcej predykcji

---

### B3. Question suggestions (community → admin approval)
**Why**: Users can propose questions, admin approves for quality control.

**DB migration** (`supabase/migrations/20250208000003_question_suggestions.sql`):
```sql
CREATE TABLE public.question_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  close_date TIMESTAMPTZ,
  suggested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',  -- pending / approved / rejected
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.question_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suggestions viewable by everyone"
  ON public.question_suggestions FOR SELECT USING (true);
CREATE POLICY "Users can create suggestions"
  ON public.question_suggestions FOR INSERT WITH CHECK (auth.uid() = suggested_by);
CREATE POLICY "Admins can update suggestions"
  ON public.question_suggestions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

**New files**:
- `src/pages/Suggest.tsx` — Form for logged-in users (title, description, category, close date). Similar layout to AskQuestion.

**Files to modify**:
- `src/App.tsx` — Add `/suggest` route (protected)
- `src/components/Header.tsx` — Admins see "Zadaj pytanie" → `/ask`, non-admins see "Zaproponuj pytanie" → `/suggest`
- `src/pages/AskQuestion.tsx` — Add "Oczekujące propozycje" section for admins at bottom. Shows pending suggestions with approve/reject buttons. Approve creates question from suggestion data.

---

## Phase C — Social & competitive features

### C1. User profile page (`/profile/:userId`)
**Why**: See prediction track record for any user.

**New files**:
- `src/pages/Profile.tsx` — Shows:
  - Display name (or email fallback), member since date
  - Stats: total predictions, questions predicted on, avg Brier score
  - List of user's predictions grouped by question (reuse extracted PredictionThread)

**Files to modify**:
- `src/App.tsx` — Add `/profile/:userId` route
- `src/components/Header.tsx` — Add profile link next to user name
- `src/pages/Questions.tsx` — Make user names in PredictionThread clickable → `/profile/:userId`

---

### C2. Leaderboard (`/leaderboard`)
**Why**: Competitive scoring drives engagement. Brier scores exist but are never shown.

**New files**:
- `src/pages/Leaderboard.tsx` — Table: rank, display name, avg Brier score (lower = better), scored prediction count. Only users with 1+ resolved predictions. Links to profiles.

**Files to modify**:
- `src/App.tsx` — Add `/leaderboard` route
- `src/components/Header.tsx` — Add "Ranking" nav link

---

### C3. My Predictions dashboard (`/my-predictions`)
**Why**: Personal dashboard to track own predictions.

**New files**:
- `src/pages/MyPredictions.tsx` — Protected page:
  - Summary stats
  - Predictions grouped by question: title, latest probability, resolution status, score
  - Filter: Aktywne / Rozstrzygnięte / Wszystkie

**Files to modify**:
- `src/App.tsx` — Add `/my-predictions` route (protected)
- `src/components/Header.tsx` — Add "Moje predykcje" link when logged in

---

## Shared refactors (done upfront before features)
- Extract `src/lib/categories.ts` — shared categories array
- Extract `src/components/PredictionThread.tsx` from Questions.tsx (reused in Profile, MyPredictions)
- Extract `src/types.ts` — shared `Question`, `Prediction`, `CommunityPrediction` interfaces

---

## Implementation order
1. Shared refactors (extract types, categories, PredictionThread component)
2. A1 — Fix prediction history (verify migration)
3. A2 — Admin edit/delete questions
4. A3 — Display names & profile editing
5. B1 — Category persistence
6. B2 — Question filtering & search
7. B3 — Question suggestions
8. C1 — User profiles
9. C2 — Leaderboard
10. C3 — My Predictions

---

## Verification
After each feature:
1. `npm run build` — must compile without errors
2. Manual test in dev server (`npm run dev`)
3. `npx supabase db push` — apply migrations to live DB
4. Test as both admin and non-admin user

---

## Key codebase context for implementation

### Existing patterns to follow
- **Supabase queries**: Direct calls via `supabase.from('table').select/insert/update/delete` — see `src/pages/Questions.tsx`
- **Auth**: `useAuth()` hook from `src/hooks/useAuth.tsx` — provides `user` and `signOut`
- **Admin check**: `useAdmin()` hook from `src/hooks/useAdmin.tsx` — provides `isAdmin` and `loading`
- **Toast notifications**: `useToast()` from `src/hooks/use-toast.ts` — `toast({ title, description, variant })`
- **Page layout**: `<Header />` + `<main className="container mx-auto px-4 py-8">` — see any page
- **Polish locale**: `import { pl } from 'date-fns/locale'` for date formatting
- **Protected routes**: Wrap in `<ProtectedRoute>` in App.tsx

### Database
- Supabase project is linked. Migrations go in `supabase/migrations/` with timestamp prefix.
- Apply with `npx supabase db push`
- RLS is enabled on all tables. Every new table needs policies.
- `profiles` table auto-created on signup via `handle_new_user()` trigger on `auth.users`

### UI components available (shadcn/ui)
Button, Card, Input, Label, Textarea, Calendar, Popover, Select, Slider, Tabs, Table, Dialog, Badge, Tooltip — all in `src/components/ui/`

### Design system
- Aurora theme colors: `crimson`, `magenta`, `lavender`, `arctic`, `peach` (Tailwind tokens)
- Glass effects: `.glass`, `.glass-dark` classes
- Gradients: `.aurora-gradient`, `.aurora-gradient-linear`
- Background pattern: `bg-gradient-to-br from-background via-arctic/10 to-lavender/10`
