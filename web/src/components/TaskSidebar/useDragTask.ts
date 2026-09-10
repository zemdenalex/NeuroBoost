import { useCallback } from 'react';
import type { Task } from '../../types';

export function useDragTask() {
  const handleDragStart = useCallback((task: Task, e: React.DragEvent) => {
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'task',
      task: {
        id: task.id,
        title: task.title,
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes,
        tags: task.tags,
      },
    }));

    // 🔴 'copy' here and 'move' on the drop target (WeekGrid's onDragOver) are
    // not the same operation. Per the HTML5 drag-and-drop model a dropEffect
    // outside effectAllowed collapses the operation to "none", and then the
    // `drop` event never fires at all — no error, nothing in the console, the
    // task simply refuses to land. Both lines arrived in one commit and neither
    // ever changed, and no e2e has ever dragged a task onto the calendar, so
    // there is nothing anywhere claiming this used to work.
    e.dataTransfer.effectAllowed = 'copyMove';

    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm font-mono text-white shadow-lg';
    dragImage.textContent = task.title.length > 30 ? task.title.slice(0, 30) + '...' : task.title;
    dragImage.style.cssText = 'position: fixed; top: -100px; left: -100px; max-width: 200px;';
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, 10, 10);

    // Clean up drag image after drag starts
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }, []);

  return { handleDragStart };
}
