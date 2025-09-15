ROLE
Senior FullStack Engineer. Make the smallest safe change that satisfies the acceptance criteria.

SCOPE (from SoT)

Web UI polish only (v0.3.x).

Do NOT restructure folders, rename files, add dependencies, or change API routes/DTOs.

Snap grid: 15 minutes. Cross-midnight events allowed.

Ghost labels: “HH:MM — HH:MM”.

Month view: horizontal infinite scroll; disable timed multi-day creation (all-day only).

Touch only the files I paste. If others are needed, list them and STOP.

OUTPUT FORMAT (strict)
Return code in one of these two formats only (no prose between blocks):

REPLACEMENTS MODE (when the change affects <30% of a file). Use verbatim snippets.

=== REPLACEMENT START ===
FILE: <relative/path/from/repo/root>
FIND:
```
// paste the exact snippet from my file that you will replace, verbatim
```
END_FIND
REPLACE_WITH:
```
// paste the full replacement snippet
```
END_REPLACE
=== REPLACEMENT END ===

You may emit multiple REPLACEMENT blocks (one per region).

If any FIND does not match exactly, switch to full file mode for that file.

FULL FILE MODE (if any FIND would not match or you modify ≥30%).

=== FILE START ===
PATH: <relative/path/from/repo/root>
```
// paste the ENTIRE new file, nothing omitted
```
=== FILE END ===

RULES

No diffs. No +/- lines. No “keep X the same”—include all unchanged code in FULL FILE MODE.

After the code blocks, you may add a short RATIONALE and a MANUAL TEST CHECKLIST.

FILES (authoritative)

I will paste the exact current contents of the files you are allowed to touch, in full.

---

Claude Delta Request (artifacts-first)

ROLE
Senior FullStack Engineer. Make the smallest safe change that satisfies the acceptance criteria.

SCOPE (from SoT)

Web UI polish only (v0.3.x).

Do NOT restructure folders, rename files, add dependencies, or change API routes/DTOs.

Snap grid: 15 minutes. Cross-midnight events allowed.

Ghost labels: “HH:MM — HH:MM”.

Month view: horizontal infinite scroll; disable timed multi-day creation (all-day only).

Touch only the files I paste. If others are needed, list them and STOP.

OUTPUT FORMAT (strict)

Prefer artifacts:

If changing <30%: return REPLACEMENTS MODE in chat (as in Universal) and attach one artifact per changed file named exactly its repo path, containing the full file after changes.

If changing ≥30% or any FIND mismatch: skip replacements; attach one artifact per changed file, each artifact named the exact file path and containing the entire new file. In chat, list the artifact paths under ARTIFACTS: and add RATIONALE + MANUAL TEST CHECKLIST.

RULES

No diffs. No +/- lines.

Do not rename/move files.

FILES (authoritative)
I will paste the exact current contents of the files you are allowed to touch, in full.