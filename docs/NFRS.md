# Non‑Functional Requirements (NFRs)

## Performance
- Week view render ≤ **1.5 s** for up to **200** visible blocks.
- Create/Update task/event ≤ **500 ms** round‑trip (p75).
- Suggestions computation ≤ **300 ms** per request (p75).
- Bot command response (text) ≤ **1 s** to first token (p75).

## Reliability
- “Green freeze” rule: promote versions only after **48 h without rage** (no blocking bugs).
- Export is **dry‑run** by default and **never deletes**.

## Security & Privacy
- TLS by default; hashed secrets with **Argon2id**.
- No third‑party telemetry or tracking. Minimal server logs with rotation.
- Principle of least privilege for API tokens and bot keys.

## Accessibility
- Full keyboard navigation and focus outlines. Minimum contrast 4.5:1.
- Prefer semantic HTML + ARIA only where needed.

## Observability
 - Local, privacy‑preserving metrics: error count, render times, suggestion timings. No PII.

## Notifications & Nudges

- **Quiet hours default**: 22:00–08:00 local time; users can override this per profile.
- **Planning nudges**: daily planning prompt at 21:00 local time and weekly planning prompt on Sunday at 18:00 local time; these times are configurable.
- **Rate limit**: cap notifications at roughly one Telegram message per minute per user; tasks sharing the same timestamp are grouped into a single notification.
- **Reminder schedule**: by default event reminders are sent at 30, 10 and 5 minutes before a scheduled event.  For tasks with time windows, the system sends a reminder at the window start, an optimal intermediate point, and ten minutes before the window closes.
- **Bot separation**: reminders are delivered through a dedicated notify bot to keep interactive commands and one‑way notifications separate.
