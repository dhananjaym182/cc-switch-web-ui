import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Providers } from './pages/Providers';
import { CustomTools } from './pages/CustomTools';
import { Profiles } from './pages/Profiles';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { McpServers } from './pages/McpServers';
import { Prompts } from './pages/Prompts';
import { Skills } from './pages/Skills';
import { EnvVars } from './pages/EnvVars';
import { Config } from './pages/Config';
import { useAuth } from './hooks/useAuth';
import { AppProvider } from './contexts/AppContext';

function AppRoutes() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <Layout onLogout={logout} />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/mcp" element={<McpServers />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/env" element={<EnvVars />} />
        <Route path="/config" element={<Config />} />
        <Route path="/custom-tools" element={<CustomTools />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch all - redirect to dashboard or login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
