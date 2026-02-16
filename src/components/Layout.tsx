import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  onLogout: () => void;
}

export function Layout({ onLogout }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);

  return (
    <div className={`h-screen flex flex-col bg-slate-100 dark:bg-slate-900 ${isDark ? 'dark' : 'light'}`}>
      {/* Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={toggleSidebar}
          onLogout={onLogout}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={toggleMobileSidebar}
          />
          <div className="fixed left-0 top-0 h-full">
            <Sidebar
              isCollapsed={false}
              onToggle={toggleMobileSidebar}
              onLogout={onLogout}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={`transition-all duration-300 flex-1 flex flex-col min-h-0 ${
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <Header
          title="CC-Switch Web UI"
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onToggleSidebar={toggleMobileSidebar}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
