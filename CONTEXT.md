# Futurykon — Domain Context

## App Identity
Canonical name: **Futurykon**. "Plutura — Prediction Market" in `README.md` is a legacy name and should be updated.

## Glossary

### Prediction
A single probability estimate (0–100 integer) submitted by a user for a question at a specific timestamp. Multiple predictions per (user, question) are allowed and together form that user's **prediction history** for that question.

### Latest Prediction
The most recent prediction a user has submitted for a given question. Used as their current stance.

### Prediction History
The full ordered log of all probabilities a user has submitted for a question, each with a timestamp. Stored as multiple rows in the `predictions` table (unique constraint was dropped in migration `20250207`).

### Interval
The period between two consecutive predictions by the same user on the same question. A user who predicts at t1 and t2 holds one interval of duration (t2 − t1).

### Scoring Model — Time-Averaged (Metaculus approach)
Each prediction interval is scored against the resolved outcome, weighted by its duration. No separate earliness multiplier — duration itself is the earliness signal.

Formula (for a question with outcome `y ∈ {0, 1}`):

```
score = Σ( score_rule(p_i, y) × (t_{i+1} − t_i) ) / total_duration
```

Where:
- `p_i` is the probability held during interval i (as a fraction 0–1)
- `t_{i+1}` is the start of the next interval (or resolution date for the final interval)
- `total_duration` = resolution_date − first_prediction_date

**Scoring rule** — Log score: `y·log(p) + (1−y)·log(1−p)`, where `y ∈ {0,1}` is the outcome and `p` is the probability as a fraction. Higher (less negative) is better. Probabilities clamped to `[0.01, 0.99]` to avoid −∞.

### Community Prediction
The geometric mean of odds across all users' **latest predictions** for a question. Computed by the `calculate_community_prediction()` DB function and replicated client-side in `PredictionHistoryChart`.

### Resolution Status
One of `'pending'`, `'yes'`, `'no'`. Set by admins. Triggers score calculation on transition from `'pending'`.

---

### Leaderboard
Ranks users by **average time-averaged log score** across all resolved questions they participated in. Higher (less negative) is better. Only users who have predicted on **5+ distinct questions** are shown (regardless of resolution status — participation threshold, not scoring threshold).

### QuestionSuggestion Tags
`question_suggestions.category TEXT` → migrate to `tags TEXT[]`, symmetric with the `questions` table migration (`20260305000001`). `QuestionSuggestion` type and the `Suggest` page UI both need updating. When a suggestion is promoted to a question, `tags` maps directly.

### close_date vs resolution_date
- `close_date` — the deadline after which no new predictions are accepted. Two gaps to fix: (1) DB-level enforcement missing — needs a `WITH CHECK` on the predictions INSERT RLS policy; (2) UI should also actively block the form (not just hide it) when `close_date` has passed.
- `resolution_date` — when the admin resolves the question. Can be before `close_date` (early resolution). Scoring uses `resolution_date` as the end of the final interval.

---

### API Key
A secret token a user generates in Developer Settings to authenticate MCP tool calls. One active key per user at a time. Stored as a hash in `api_keys (id, user_id, key_hash, created_at)`. Shown **once** at generation time; cycling (regenerating) invalidates the old key. Scopes are derived from `profiles.is_admin` — no separate scope column. Validated server-side by the MCP Edge Function.

### MCP Edge Function
A Supabase Edge Function (`functions/mcp`) that acts as the trust boundary between the public MCP package and the Supabase DB. Holds the service role key. Validates incoming API keys against `api_keys`, resolves `user_id`, and executes Supabase operations with explicit user scoping. Never exposed in client code.

### MCP Server
An npm-published Node.js package (`futurykon-mcp`, repo `Futurykon/futurykon-mcp`). Runs locally on the user's machine via `npx futurykon-mcp`. Speaks MCP stdio protocol to the local agent (Claude Desktop, Cursor, etc.) and translates tool calls to HTTPS requests to the **MCP Edge Function**. Contains no secrets — only the user's API key (provided at startup).

### MCP Tools
The set of operations the MCP Server exposes to agents:

**Read — any authenticated user:**
- `list_questions(status?, tag?)`
- `search_questions(query?, tags[]?, status?, closing_before?, closing_after?, created_after?)`
- `get_question(id)` — includes community prediction
- `get_my_predictions()` — latest prediction per question for the key's user
- `get_leaderboard()`

**Write — user-level:**
- `create_prediction(question_id, probability, reasoning?)`

**Write — admin-level** (only available when `profiles.is_admin = true`):
- `create_question(title, resolution_criteria, close_date, tags?)`
- `resolve_question(id, outcome)`
- `delete_question(id)`

### Developer Settings
A page in the Futurykon app (`/settings/developer`) where users can generate and cycle their API key. Shows key status (created_at) but never the key itself after initial display.

---

## To Do

### Scoring overhaul
- [ ] New migration: create `question_scores (question_id, user_id, log_score)` table with RLS
- [ ] New migration: drop `brier_score` and `time_weighted_score` from `predictions`
- [ ] New migration: replace `calculate_brier_score` / `calculate_time_weighted_score` / `update_prediction_scores` trigger with time-averaged log score computed across full prediction history
- [ ] New migration: backfill `question_scores` for all already-resolved questions
- [ ] Update `getPredictionsWithBrierScores()` service → new `getQuestionScores()` against `question_scores`
- [ ] Update `Leaderboard.tsx`: query `question_scores`, sort descending, filter to users with 5+ distinct questions predicted on, rename column labels

### Question suggestions — tags
- [ ] New migration: `question_suggestions.category TEXT` → `tags TEXT[]`
- [ ] Update `QuestionSuggestion` type in `src/types.ts`
- [ ] Update `createSuggestion()` in `src/services/questionSuggestions.ts`
- [ ] Update `Suggest.tsx` UI (multi-select tags, same as `AskQuestion.tsx`)
- [ ] Update admin approval flow to map `suggestion.tags` → `question.tags`

### close_date enforcement
- [ ] New migration: add `WITH CHECK (now() < (SELECT close_date FROM questions WHERE id = question_id))` to predictions INSERT RLS policy

### Housekeeping
- [ ] Update `README.md`: replace "Plutura — Prediction Market" with Futurykon
