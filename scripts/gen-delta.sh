#!/usr/bin/env bash
# gen-delta.sh — create a DELTA request stub
set -euo pipefail
OUT=${1:-"delta-$(date +%Y%m%d-%H%M).md"}
cat > "$OUT" <<'EOT'
# Delta Request

Files: 
Goal: 
Constraints: 
Acceptance:
- [ ] Behavior matches description
- [ ] No console/server errors
- [ ] Meets NFR timings
- [ ] Tests/docs updated
Non‑goals: 

Context (minimal snippet):
```
```

Return: unified diff + run commands + verification checklist.
EOT
echo "Created $OUT"
