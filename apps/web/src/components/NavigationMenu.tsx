// apps/web/src/components/NavigationMenu.tsx

export function NavigationMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pages = [
    { path: '#/', label: 'Calendar', icon: '📅' },
    { path: '#/tasks', label: 'Tasks', icon: '📋' },
    { path: '#/reflections', label: 'Reflections', icon: '🪞' },
    { path: '#/goals', label: 'Goals & Dreams', icon: '🎯' },
    { path: '#/time', label: 'Time Planning', icon: '⏰' },
    { path: '#/export', label: 'Export', icon: '💾' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div 
        className="fixed left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-700 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">NeuroBoost</h2>
        
        <nav className="space-y-1">
          {pages.map(page => (
            <a
              key={page.path}
              href={page.path}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800 transition-colors"
              onClick={onClose}
            >
              <span className="text-xl">{page.icon}</span>
              <span>{page.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}