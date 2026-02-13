import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Wrench,
  FolderOpen,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  MessageSquare,
  Zap,
  Terminal,
  Save,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/providers', icon: Server, label: 'Providers' },
  { path: '/mcp', icon: Database, label: 'MCP Servers' },
  { path: '/prompts', icon: MessageSquare, label: 'Prompts' },
  { path: '/skills', icon: Zap, label: 'Skills' },
  { path: '/env', icon: Terminal, label: 'Env Vars' },
  { path: '/config', icon: Save, label: 'Config' },
  { path: '/custom-tools', icon: Wrench, label: 'Custom Tools' },
  { path: '/profiles', icon: FolderOpen, label: 'Profiles' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ isCollapsed, onToggle, onLogout }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-900 dark:bg-slate-950 border-r border-slate-800 transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="font-semibold text-white">Switch UI</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
