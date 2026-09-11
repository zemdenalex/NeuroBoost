import { describe, it, expect } from 'vitest'

/**
 * A task row must carry controls a finger can reach, and the drag it starts
 * must be an operation the drop target will accept.
 *
 * 🔴 Both of these were reported by Denis on 10.09 as "не работает", and both
 * had passing tests around them at the time:
 *
 * - editing a task existed only as `onDoubleClick` on the row. A phone has no
 *   double-click. `pages/Calendar/taskHandlers.test.ts` asserted that
 *   `onEditTask` was no longer a `console.log` stub — and asserted nothing
 *   about a control existing that calls it. Green test, unreachable feature.
 * - the drag source declared `effectAllowed = 'copy'` while the grid's
 *   `onDragOver` set `dropEffect = 'move'`. Under the HTML5 drag-and-drop model
 *   an operation outside `effectAllowed` collapses to "none" and the `drop`
 *   event never fires. Nothing failed anywhere; the task just would not land.
 *
 * Source-scanned because this project has no React renderer in its test
 * dependencies (vitest + jsdom, no @testing-library). Same idiom as the sibling
 * scans; the browser-level proof is e2e's job.
 */

const sources = import.meta.glob(
  ['./TaskItem.tsx', './PriorityGroup.tsx', './useDragTask.ts', '../Calendar/WeekGrid/WeekGrid.tsx'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

function read(name: string): string {
  const key = Object.keys(sources).find(k => k.endsWith(name))
  return key ? sources[key] : ''
}

describe('the task row carries a reachable edit control', () => {
  const taskItem = read('TaskItem.tsx')
  const priorityGroup = read('PriorityGroup.tsx')

  it('found the files to check', () => {
    // The floor: a rename would otherwise leave every assertion below scanning
    // an empty string and reporting success.
    expect(taskItem, 'TaskItem.tsx not found — this test guards nothing').toBeTruthy()
    expect(priorityGroup, 'PriorityGroup.tsx not found — this test guards nothing').toBeTruthy()
  })

  it('renders a button, not only a double-click handler', () => {
    // The defect exactly: onEdit wired to nothing you can press.
    expect(taskItem).toMatch(/<button[\s\S]{0,400}onEdit\(\)/)
  })

  it('does not hide that button on touch, where there is no hover', () => {
    // `opacity-0` with only a `group-hover` escape is invisible and unpressable
    // on a phone — which is where the report came from.
    const editButton = taskItem.slice(taskItem.indexOf('data-testid="task-edit"'))
    expect(editButton, 'the edit button lost its test id').toBeTruthy()
    const className = /className=\{?"([^"]*)"/.exec(editButton)?.[1] ?? ''
    expect(className, 'the edit button has no classes to check').toBeTruthy()
    // 🔴 Assert the ABSENCE of a bare `opacity-0`, not the presence of
    // `opacity-100`. The first version of this test looked for `opacity-100`
    // and passed against `opacity-0 md:group-hover:opacity-100` — the exact
    // hidden-on-touch state it was written to forbid — because the hover
    // variant contains the substring. It could not fail for its own defect.
    const hiddenAtRest = /(^|\s)opacity-0(\s|$)/.test(className)
    expect(hiddenAtRest, `edit button classes: ${className}`).toBe(false)
  })

  it('is fed the edit action by the group that owns the task', () => {
    expect(priorityGroup).toMatch(/onEdit=\{\(\) => onEditTask\(task\)\}/)
  })
})

describe('the drag a task starts is one the calendar can accept', () => {
  const source = read('useDragTask.ts')
  const target = read('WeekGrid.tsx')

  it('found both halves of the drag', () => {
    expect(source, 'useDragTask.ts not found').toBeTruthy()
    expect(target, 'WeekGrid.tsx not found').toBeTruthy()
  })

  it('the drop effect the grid asks for is permitted by the source', () => {
    const allowed = /effectAllowed\s*=\s*'([^']+)'/.exec(source)?.[1]
    const dropEffect = /dropEffect\s*=\s*'([^']+)'/.exec(target)?.[1]

    expect(allowed, 'the drag source no longer sets effectAllowed').toBeTruthy()
    expect(dropEffect, 'the grid no longer sets dropEffect').toBeTruthy()

    // What the spec permits: 'all' and 'uninitialized' allow anything; the
    // paired values allow either of their halves; otherwise the two must match.
    const permits: Record<string, string[]> = {
      all: ['copy', 'link', 'move'],
      uninitialized: ['copy', 'link', 'move'],
      copy: ['copy'],
      link: ['link'],
      move: ['move'],
      copyLink: ['copy', 'link'],
      copyMove: ['copy', 'move'],
      linkMove: ['link', 'move'],
      none: [],
    }

    expect(
      permits[allowed!] ?? [],
      `effectAllowed='${allowed}' does not permit dropEffect='${dropEffect}' — ` +
        'the operation collapses to "none" and the drop event never fires',
    ).toContain(dropEffect!)
  })
})
