<#
    .SYNOPSIS
    Generate a Delta Request stub for NeuroBoost.

    .DESCRIPTION
    Creates a markdown file with the required fields for a Delta Request.  Use this on Windows
    to standardize LLM prompts when requesting changes.  Defaults to a timestamped filename
    like `delta-20250911-1230.md` if no output path is provided.

    .PARAMETER OutFile
    The path where the Delta Request will be saved.  Optional.
#>
param(
    [string]$OutFile = $("delta-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".md")
)

$content = @"
# Delta Request

Files:
Goal:
Constraints:
Acceptance:
- [ ] Behavior matches description
- [ ] No console/server errors
- [ ] Meets NFR timings
- [ ] Tests/docs updated
Non-goals:

Context (minimal snippet):
```
```

Return: unified diff + run commands + verification checklist.
"@

Set-Content -Path $OutFile -Value $content -Encoding utf8
Write-Host "Created $OutFile"