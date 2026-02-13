import { Sun, Moon, Menu, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useApp, APP_OPTIONS, AppType } from '../contexts/AppContext';

interface HeaderProps {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
}

export function Header({
  title,
  isDark,
  onToggleTheme,
  onToggleSidebar,
}: HeaderProps) {
  const { selectedApp, setSelectedApp } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAppOption = APP_OPTIONS.find(opt => opt.value === selectedApp);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAppSelect = (app: AppType) => {
    setSelectedApp(app);
    setIsDropdownOpen(false);
  };

  // Group apps by category
  const coreApps = APP_OPTIONS.filter(opt => opt.category === 'core');
  const customApps = APP_OPTIONS.filter(opt => opt.category === 'custom');

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* App Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
              aria-label="Select application"
            >
              <span className="text-lg">{selectedAppOption?.icon}</span>
              <span className="hidden sm:inline">{selectedAppOption?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                {/* Core Apps Section */}
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Core Apps
                </div>
                {coreApps.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAppSelect(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      selectedApp === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span>{option.label}</span>
                    {selectedApp === option.value && (
                      <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                    )}
                  </button>
                ))}
                
                {/* Divider */}
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                
                {/* Custom Apps Section */}
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Custom Apps
                </div>
                {customApps.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAppSelect(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      selectedApp === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span>{option.label}</span>
                    {selectedApp === option.value && (
                      <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
