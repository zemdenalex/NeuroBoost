// apps/web/src/components/HorizontalHeader.tsx
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

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

export function HorizontalHeader() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');

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
    <header className="w-full bg-zinc-900 border-b border-zinc-700 font-mono">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Logo/Brand */}
        <a 
          href="#/"
          className="flex items-center gap-2 text-lg font-semibold text-white hover:text-zinc-300 transition-colors"
        >
          <HomeIcon fontSize="medium" />
          <span>NeuroBoost</span>
        </a>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all
                ${isActive(item.path)
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }
              `}
            >
              {item.icon}
              <span className="hidden lg:inline">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <a
            href="#/settings"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
            title="Settings"
          >
            <SettingsIcon fontSize="small" />
          </a>
          <a
            href="#/login"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-all"
          >
            <LoginIcon fontSize="small" />
            <span>Login</span>
          </a>
        </div>
      </div>
    </header>
  );
}