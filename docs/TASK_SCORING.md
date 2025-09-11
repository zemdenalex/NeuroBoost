# Task Scoring (Initial)

The suggestion engine ranks tasks based on multiple factors.  It currently uses a **simple linear formula** and is designed to be extended as more data becomes available.

## Default Simple Score

The default score for a task *t* is:

```
S_simple(t) = ((D(t) / max(estimateMin(t), 5)) * priority(t)) + C(t) + E(t) - R(t)
```

Where:

- **D(t) (Deadline/window proximity)**: a piecewise score derived from how close the task’s `deadlineAt` or end of its `window` is to the current time.  Tasks with no deadline or window contribute 0.
- **priority(t)**: the user‑assigned priority (1–5).
- **C(t) (Context fit)**: +1 if the current user context (e.g., `@home`) exactly matches one of `t.contexts`; +0.5 if partially matches; 0 otherwise.
- **E(t) (Energy match)**: +1 if the user’s current energy (1–5) is within ±1 of `t.energy`; +0 otherwise.
- **R(t) (Risk/penalties)**: 0..5 penalty if dependencies are unresolved, the task’s estimate exceeds the available free window, or the task has recently failed.  Each manual bump (see `aging.bumps`) adds a small bonus rather than a penalty.

Only the top‑N tasks by score are suggested, along with a short rationale.  The system **never auto‑schedules** tasks — users always confirm.

## Emotional Difficulty (future)

Tasks also have an `emotionalDifficulty` (1–5), representing how much emotional resistance they evoke.  This field is **not yet used** in the scoring formula but will influence suggestions in future releases (v0.5.x), for example by boosting scores for high‑difficulty tasks or prompting task splitting.

## Advanced Add‑ons (opt‑in later)

The simple formula can be extended with additional terms as the system matures:

- `agingBoost` — an incremental boost based on `aging.bumps`, surfacing tasks that have been postponed multiple times.
- `pastAdherence` — adjusting scores based on historical completion rates for similar tasks or contexts.
- `routineWeight` — boosting tasks that belong to active routines when those routines are running.
- `emotionalDifficulty` — adding or subtracting weight based on how emotionally challenging the task is.

As more data accumulates and reflection statistics become available, these factors will be tuned to improve recommendation quality.
