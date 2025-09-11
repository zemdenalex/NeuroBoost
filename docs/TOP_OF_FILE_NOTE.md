# Top of File Note Template

Place this note at the very top of any **large or complex file** (UI component, service, or module).  It explains at a glance what the file does, how it fits into the system, and what other pieces it touches.  Keeping these notes up to date makes it easier to reason about code in isolation and reduces the need for repeated context in conversations with large language models.

```
<!--
File: WeekGrid.tsx

Purpose:
  - Renders the weekly calendar grid with days on the x‑axis and hours on the y‑axis.
  - Handles drag‑to‑create and drag‑to‑resize for timed events.
  - Displays deadline‑only tasks beneath the grid with a red deadline line overlay.

Key props / state:
  - events: Event[] — scheduled timed events and all‑day events.
  - tasks: Task[] — deadline‑only tasks awaiting scheduling.
  - onCreate(EventInput) — callback to create a new event.
  - onUpdate(id, updates) — callback to update an existing event.

Interactions:
  - Reads from `@/store/events` and `@/store/tasks` via selectors.
  - Writes new/updated events via dispatched actions.
  - Emits `openEventEditor` when a block is double‑clicked.
  - Consumes context windows from `@/hooks/useContextWindow`.

Performance notes:
  - Avoids unnecessary re‑renders by memoizing cell rendering.
  - Limits the number of visible blocks to 200 per view; see NFRs.

Accessibility notes:
  - Supports keyboard navigation using arrow keys and enter to select/create.
  - Provides aria labels for drag handles and events.

-->
```

Use this note as a starting point and customize the **Purpose**, **Key props / state**, **Interactions**, **Performance notes**, and **Accessibility notes** for each file.  Keep it concise (<50 lines) but comprehensive enough for a new contributor to understand the file’s role without reading the entire implementation.