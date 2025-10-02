// apps/web/src/router.tsx
import React, { Suspense } from 'react';
import { Layout } from './components/Layout';

/**
 * Route Configuration
 * 
 * Each route defines:
 * - path: The hash route (e.g., '/', '/tasks')
 * - component: Lazy-loaded page component
 * - useLayout: Whether to wrap in Layout component (header/sidebar)
 * - label: Human-readable name (for nav, breadcrumbs, etc.)
 */

// Lazy-load all pages for code splitting
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Calendar = React.lazy(() => import('./App')); // Legacy: App.tsx is the calendar
const Tasks = React.lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const TimePlanning = React.lazy(() => import('./pages/TimePlanning').then(m => ({ default: m.TimePlanning })));
const Reflections = React.lazy(() => import('./pages/Reflections').then(m => ({ default: m.Reflections })));
const Goals = React.lazy(() => import('./pages/GoalsAndDreams').then(m => ({ default: m.GoalsAndDreams })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Gamification = React.lazy(() => import('./pages/Gamification').then(m => ({ default: m.Gamification })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Export = React.lazy(() => import('./pages/Export'));

type RouteConfig = {
  path: string;
  component: React.LazyExoticComponent<() => JSX.Element>;
  useLayout: boolean;
  label: string;
};

/**
 * Route definitions
 * 
 * To add a new page:
 * 1. Create the page component in src/pages/
 * 2. Lazy-load it above
 * 3. Add a new route here
 * 4. Set useLayout: true for most pages, false for full-screen (export, maybe auth)
 */
const routes: RouteConfig[] = [
  // Landing page
  { 
    path: '/', 
    component: Home, 
    useLayout: true, 
    label: 'Home' 
  },
  
  // Calendar views (both /calendar and /schedule point to same component)
  { 
    path: '/calendar', 
    component: Calendar, 
    useLayout: false, // Calendar has its own header
    label: 'Calendar' 
  },
  { 
    path: '/schedule', 
    component: Calendar, 
    useLayout: false, // Calendar has its own header
    label: 'Schedule' 
  },
  
  // Task management
  { 
    path: '/tasks', 
    component: Tasks, 
    useLayout: true, 
    label: 'Tasks' 
  },
  
  // Time & Planning
  { 
    path: '/time', 
    component: TimePlanning, 
    useLayout: true, 
    label: 'Time Planning' 
  },
  
  // Reflections
  { 
    path: '/reflections', 
    component: Reflections, 
    useLayout: true, 
    label: 'Reflections' 
  },
  
  // Goals & Dreams
  { 
    path: '/goals', 
    component: Goals, 
    useLayout: true, 
    label: 'Goals' 
  },
  
  // Profile & Stats
  { 
    path: '/profile', 
    component: Profile, 
    useLayout: true, 
    label: 'Profile' 
  },
  
  // Gamification / Progress
  { 
    path: '/game', 
    component: Gamification, 
    useLayout: true, 
    label: 'Progress' 
  },
  
  // Settings
  { 
    path: '/settings', 
    component: Settings, 
    useLayout: true, 
    label: 'Settings' 
  },
  
  // Auth pages
  { 
    path: '/login', 
    component: Login, 
    useLayout: false, // Full-screen auth experience
    label: 'Login' 
  },
  { 
    path: '/signup', 
    component: Login, // Same component, different mode
    useLayout: false,
    label: 'Sign Up' 
  },
  
  // Export (full-screen)
  { 
    path: '/export', 
    component: Export, 
    useLayout: false,
    label: 'Export' 
  }
];

/**
 * Loading fallback shown while lazy-loading components
 */
const LoadingFallback = () => (
  <div className="h-screen flex items-center justify-center bg-black text-zinc-100">
    <div className="text-center">
      <div className="text-xl font-mono animate-pulse">Loading...</div>
    </div>
  </div>
);

/**
 * 404 Not Found page
 */
const NotFound = () => (
  <div className="h-screen flex items-center justify-center bg-black text-zinc-100 font-mono">
    <div className="text-center max-w-md">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-zinc-400 mb-6">Page not found</p>
      <a 
        href="#/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded inline-block"
      >
        Go Home
      </a>
    </div>
  </div>
);

/**
 * Route matcher
 * Finds the matching route for the current hash path
 */
function matchRoute(currentPath: string): RouteConfig | null {
  // Exact match first
  const exactMatch = routes.find(route => route.path === currentPath);
  if (exactMatch) return exactMatch;
  
  // Prefix match for nested routes (e.g., /tasks/123 matches /tasks)
  const prefixMatch = routes.find(route => 
    route.path !== '/' && currentPath.startsWith(route.path)
  );
  if (prefixMatch) return prefixMatch;
  
  return null;
}

/**
 * Hash-based router using useSyncExternalStore
 * Subscribes to hash changes and re-renders on navigation
 */
function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getSnapshot() {
  return window.location.hash.replace(/^#/, '') || '/';
}

/**
 * Root Router Component
 * 
 * Handles:
 * - Hash-based routing
 * - Layout wrapping (optional per route)
 * - Loading states
 * - 404 handling
 */
export default function RootRouter() {
  const [hash, setHash] = React.useState(getSnapshot());
  
  React.useEffect(() => {
    const handleHashChange = () => setHash(getSnapshot());
    return subscribe(handleHashChange);
  }, []);
  
  const currentPath = hash || '/';
  const route = matchRoute(currentPath);
  
  // 404 handling
  if (!route) {
    return <NotFound />;
  }
  
  const PageComponent = route.component;
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      {route.useLayout ? (
        <Layout>
          <PageComponent />
        </Layout>
      ) : (
        <PageComponent />
      )}
    </Suspense>
  );
}

/**
 * Export route config for use in navigation components
 * Allows nav components to build menus from route definitions
 */
export { routes, type RouteConfig };