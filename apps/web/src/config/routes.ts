// apps/web/src/config/routes.ts
/**
 * Route Configuration for Navigation
 * 
 * This file defines routes that appear in navigation components
 * (headers, sidebars, menus). Separate from router.tsx for clarity.
 */

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

export type NavRoute = {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  description?: string;
  showInNav?: boolean; // Whether to show in main navigation
  requiresAuth?: boolean; // Future: auth-protected routes
};

/**
 * Main navigation routes
 * These appear in header/sidebar navigation
 */
export const NAV_ROUTES: NavRoute[] = [
  {
    label: 'Home',
    path: '#/',
    icon: HomeIcon,
    description: 'Landing page',
    showInNav: true,
  },
  {
    label: 'Calendar',
    path: '#/calendar',
    icon: CalendarMonthIcon,
    description: 'Monthly calendar view',
    showInNav: true,
  },
  {
    label: 'Schedule',
    path: '#/schedule',
    icon: ScheduleIcon,
    description: 'Weekly schedule view',
    showInNav: true,
  },
  {
    label: 'Tasks',
    path: '#/tasks',
    icon: CheckBoxIcon,
    description: 'Task management',
    showInNav: true,
  },
  {
    label: 'Planning',
    path: '#/time',
    icon: ScheduleIcon,
    description: 'Time planning & blocks',
    showInNav: true,
  },
  {
    label: 'Reflections',
    path: '#/reflections',
    icon: PsychologyIcon,
    description: 'Daily reflections',
    showInNav: true,
  },
  {
    label: 'Goals',
    path: '#/goals',
    icon: FlagIcon,
    description: 'Goals & dreams',
    showInNav: true,
  },
  {
    label: 'Progress',
    path: '#/game',
    icon: EmojiEventsIcon,
    description: 'XP, achievements, progress',
    showInNav: true,
  },
  {
    label: 'Profile',
    path: '#/profile',
    icon: PersonIcon,
    description: 'Your profile & stats',
    showInNav: true,
  },
];

/**
 * Utility routes (settings, auth, etc.)
 * These appear in separate sections or menus
 */
export const UTILITY_ROUTES: NavRoute[] = [
  {
    label: 'Settings',
    path: '#/settings',
    icon: SettingsIcon,
    description: 'App settings',
    showInNav: false,
  },
  {
    label: 'Login',
    path: '#/login',
    icon: LoginIcon,
    description: 'Sign in',
    showInNav: false,
  },
];

/**
 * All routes combined
 */
export const ALL_ROUTES = [...NAV_ROUTES, ...UTILITY_ROUTES];

/**
 * Route groups for organized navigation
 * Useful for sidebars with sections
 */
export const ROUTE_GROUPS = {
  core: {
    label: 'Core',
    routes: NAV_ROUTES.slice(0, 3), // Home, Calendar, Schedule
  },
  productivity: {
    label: 'Productivity',
    routes: NAV_ROUTES.slice(3, 5), // Tasks, Planning
  },
  growth: {
    label: 'Growth',
    routes: NAV_ROUTES.slice(5, 8), // Reflections, Goals, Progress
  },
  account: {
    label: 'Account',
    routes: NAV_ROUTES.slice(8, 9), // Profile
  },
};

/**
 * Helper to check if a route is active
 */
export function isRouteActive(routePath: string, currentHash: string): boolean {
  const cleanRoute = routePath.replace(/^#/, '');
  const cleanHash = currentHash.replace(/^#/, '') || '/';
  
  // Exact match
  if (cleanRoute === cleanHash) return true;
  
  // Prefix match for nested routes (but not for root)
  if (cleanRoute !== '/' && cleanHash.startsWith(cleanRoute)) return true;
  
  return false;
}

/**
 * Helper to get route by path
 */
export function getRouteByPath(path: string): NavRoute | undefined {
  return ALL_ROUTES.find(route => route.path === path);
}