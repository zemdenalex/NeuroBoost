// apps/web/src/router.tsx - Update existing file

import React, { useEffect, useSyncExternalStore, Suspense } from 'react';
import App from './App';

// Lazy load all pages
const ExportPanel = React.lazy(() => import('./pages/Export'));
const GoalsAndDreams = React.lazy(() => import('./pages/GoalsAndDreams'));
const Reflections = React.lazy(() => import('./pages/Reflections'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const TimePlanning = React.lazy(() => import('./pages/TimePlanning'));

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
function getSnapshot() { return window.location.hash || '#/'; }

export default function RootRouter() {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const route = hash.replace(/^#/, '');

  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-black text-zinc-100">
        <div className="text-center">
          <div className="text-xl font-mono">Loading...</div>
        </div>
      </div>
    }>
      {route === '/export' ? <ExportPanel /> :
       route === '/goals' ? <GoalsAndDreams /> :
       route === '/reflections' ? <Reflections /> :
       route === '/tasks' ? <Tasks /> :
       route === '/time' ? <TimePlanning /> :
       <App />}
    </Suspense>
  );
}