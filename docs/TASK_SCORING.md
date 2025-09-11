# Task Scoring (Initial)

The suggestion engine ranks tasks based on multiple factors. The current scoring formula is:

```
score = U + P + Ctx + Eng + Cat − R
```

Where:

- **U (Urgency)**: `1 / hoursToDeadline` if the task has a `deadlineAt`, else 0. The closer the deadline, the higher the urgency.
- **P (Priority)**: numeric weight from user priority (1–5).
- **Ctx (Context fit)**: +1 if the task’s contexts include the current context; +0.5 if partially matches (e.g., any of multiple contexts). 0 if none.
- **Eng (Energy match)**: +1 if the task’s energy requirement matches the user’s current energy level; 0 otherwise.
- **Cat (Category weight)**: based on `category`:
  - `emergency`: +4
  - `asap`: +3
  - `must_today`: +2
  - `deadline_soon`: +1
  - `if_possible` or `null`: +0
- **R (Risk of failure)**: penalty (0..5) if dependencies are unresolved, estimate is longer than available free window, or the task has recently failed to be completed.

Return the top‑N tasks with a brief rationale for each. The engine never schedules tasks automatically — it surfaces suggestions and requires user confirmation.
