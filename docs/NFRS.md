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
