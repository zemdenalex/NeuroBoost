// apps/web/src/components/Layout.tsx
import { useState, useEffect } from 'react';
import { HorizontalHeader } from './HorizontalHeader';
import { VerticalSidebar } from './VerticalSidebar';

type HeaderStyle = 'horizontal' | 'vertical';

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>(() => {
    return (localStorage.getItem('headerStyle') as HeaderStyle) || 'horizontal';
  });

  useEffect(() => {
    // Listen for storage changes (in case settings are changed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'headerStyle' && e.newValue) {
        setHeaderStyle(e.newValue as HeaderStyle);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (headerStyle === 'vertical') {
    return (
      <div className="flex h-screen bg-black">
        <VerticalSidebar />
        <main className="flex-1 ml-64 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      <HorizontalHeader />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}