// apps/web/src/components/VerticalSidebar.tsx
import { useEffect, useState } from 'react';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FlagIcon from '@mui/icons-material/Flag';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SettingsIcon from '@mui/icons-material/Settings';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

export function VerticalSidebar() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navItems: NavItem[] = [
    { label: 'Home', path: '#/', icon: <HomeIcon fontSize="small" /> },
    { label: 'Calendar', path: '#/calendar', icon: <CalendarMonthIcon fontSize="small" /> },
    { label: 'Schedule', path: '#/schedule', icon: <ScheduleIcon fontSize="small" /> },
    { label: 'Tasks', path: '#/tasks', icon: <CheckBoxIcon fontSize="small" /> },
    { label: 'Planning', path: '#/time', icon: <ScheduleIcon fontSize="small" /> },
    { label: 'Reflections', path: '#/reflections', icon: <PsychologyIcon fontSize="small" /> },
    { label: 'Goals', path: '#/goals', icon: <FlagIcon fontSize="small" /> },
    { label: 'Progress', path: '#/game', icon: <EmojiEventsIcon fontSize="small" /> },
    { label: 'Profile', path: '#/profile', icon: <PersonIcon fontSize="small" /> },
  ];

  const isActive = (path: string) => {
    if (path === '#/' && currentPath === '#/') return true;
    if (path !== '#/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-zinc-900 border-r border-zinc-700 font-mono
        transition-all duration-300 ease-in-out z-50
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Logo/Brand + Collapse Toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          {!isCollapsed && (
            <a 
              href="#/"
              className="flex items-center gap-2 text-lg font-semibold text-white hover:text-zinc-300 transition-colors"
            >
              <HomeIcon fontSize="medium" />
              <span>NeuroBoost</span>
            </a>
          )}
          {isCollapsed && (
            <a 
              href="#/"
              className="flex items-center justify-center w-full text-white hover:text-zinc-300 transition-colors"
            >
              <HomeIcon fontSize="medium" />
            </a>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all
              ${isCollapsed ? 'mx-auto' : ''}
            `}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <MenuIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all
                  ${isActive(item.path)
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </a>
            ))}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-zinc-700 p-2 space-y-1">
          <a
            href="#/settings"
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded text-sm text-zinc-400 
              hover:text-white hover:bg-zinc-800 transition-all
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <SettingsIcon fontSize="small" />
            {!isCollapsed && <span>Settings</span>}
          </a>
          <a
            href="#/login"
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded text-sm
              bg-blue-600 hover:bg-blue-700 text-white transition-all
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Login' : undefined}
          >
            <LoginIcon fontSize="small" />
            {!isCollapsed && <span>Login</span>}
          </a>
        </div>
      </div>
    </aside>
  );
}