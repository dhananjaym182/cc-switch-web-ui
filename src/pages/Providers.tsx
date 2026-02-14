import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Edit } from 'lucide-react';
import { Card } from '../components/Card';
import { ProviderCard } from '../components/ProviderCard';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { providersApi } from '../services/api';
import { useApp } from '../contexts/AppContext';
import type { Provider, SpeedtestResult } from '../types';

export function Providers() {
  const { selectedApp } = useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newProvider, setNewProvider] = useState({
    id: '',
    name: '',
    apiUrl: '',
    apiKey: '',
    app: 'claude',
    websiteUrl: '',
    notes: '',
    model: '',
    haikuModel: '',
    sonnetModel: '',
    opusModel: ''
  });
  const [editProvider, setEditProvider] = useState({
    id: '',
    name: '',
    apiUrl: '',
    apiKey: '',
    app: 'claude',
    websiteUrl: '',
    notes: '',
    model: '',
    haikuModel: '',
    sonnetModel: '',
    opusModel: ''
  });
  
  // Speedtest state
  const [speedtestingId, setSpeedtestingId] = useState<string | null>(null);
  const [speedtestResults, setSpeedtestResults] = useState<Record<string, SpeedtestResult>>({});
  
  // Duplicate modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateProvider, setDuplicateProvider] = useState<Provider | null>(null);
  const [duplicateNewId, setDuplicateNewId] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await providersApi.list(selectedApp);
      setProviders(response.providers || []);
      setCurrentProviderId(response.currentProviderId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentProvider = async () => {
    try {
      const response = await providersApi.getCurrent(selectedApp);
      setCurrentProvider(response.provider);
      setCurrentProviderId(response.providerId);
    } catch (err) {
      console.error('Failed to fetch current provider:', err);
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchCurrentProvider();
  }, [selectedApp]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSwitch = async (providerId: string) => {
    setSwitchingId(providerId);
    setError(null);
    try {
      const response = await providersApi.switch(providerId);
      if (response.success) {
        setCurrentProviderId(providerId);
        setProviders(
          (prevProviders) => prevProviders.map((p) => ({
            ...p,
            isActive: p.id === providerId,
          }))
        );
        // Update current provider state
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
          setCurrentProvider(provider);
        }
        setSuccess(`Switched to provider: ${provider?.name || providerId}`);
      } else {
        setError(response.message || 'Failed to switch provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch provider');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm(`Are you sure you want to delete provider "${providerId}"?`)) {
      return;
    }

    try {
      await providersApi.delete(providerId, selectedApp);
      await fetchProviders();
      setSuccess('Provider deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.id || !newProvider.name || !newProvider.apiUrl) return;

    setIsAdding(true);
    setError(null);
    try {
      await providersApi.add(newProvider, selectedApp);
      setShowAddModal(false);
      setNewProvider({ id: '', name: '', apiUrl: '', apiKey: '', app: selectedApp, websiteUrl: '', notes: '', model: '', haikuModel: '', sonnetModel: '', opusModel: '' });
      await fetchProviders();
      setSuccess('Provider added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add provider');
    } finally {
      setIsAdding(false);
    }
  };

  const openEditModal = (provider: Provider) => {
    // Extract API URL from config if available
    const apiUrl = (provider.config?.apiUrl as string) || (provider.config?.baseUrl as string) || '';
    const apiKey = (provider.config?.apiKey as string) || '';
    const app = (provider.config?.app as string) || 'claude';
    const websiteUrl = (provider.config?.websiteUrl as string) || '';
    const notes = (provider.config?.notes as string) || '';
    const model = (provider.config?.model as string) || '';
    const haikuModel = (provider.config?.haikuModel as string) || '';
    const sonnetModel = (provider.config?.sonnetModel as string) || '';
    const opusModel = (provider.config?.opusModel as string) || '';
    setEditProvider({
      id: provider.id,
      name: provider.name,
      apiUrl,
      apiKey,
      app,
      websiteUrl,
      notes,
      model,
      haikuModel,
      sonnetModel,
      opusModel
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProvider.id) return;

    setIsEditing(true);
    setError(null);
    try {
      await providersApi.edit(editProvider, selectedApp);
      setShowEditModal(false);
      setEditProvider({ id: '', name: '', apiUrl: '', apiKey: '', app: selectedApp, websiteUrl: '', notes: '', model: '', haikuModel: '', sonnetModel: '', opusModel: '' });
      await fetchProviders();
      setSuccess('Provider updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit provider');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSpeedtest = async (providerId: string) => {
    setSpeedtestingId(providerId);
    setError(null);
    try {
      const result = await providersApi.speedtest(providerId, selectedApp);
      setSpeedtestResults(prev => ({
        ...prev,
        [providerId]: {
          success: result.success,
          latency: result.latency,
          message: result.message,
          error: result.error,
        }
      }));
      if (result.success) {
        setSuccess(`Speed test completed: ${result.latency}ms`);
      } else {
        setError(`Speed test failed: ${result.error || result.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run speed test';
      setSpeedtestResults(prev => ({
        ...prev,
        [providerId]: {
          success: false,
          error: errorMessage,
        }
      }));
      setError(errorMessage);
    } finally {
      setSpeedtestingId(null);
    }
  };

  const openDuplicateModal = (provider: Provider) => {
    setDuplicateProvider(provider);
    setDuplicateNewId(`${provider.id}-copy`);
    setShowDuplicateModal(true);
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateProvider || !duplicateNewId) return;

    setIsDuplicating(true);
    setError(null);
    try {
      await providersApi.duplicate(duplicateProvider.id, duplicateNewId, selectedApp);
      setShowDuplicateModal(false);
      setDuplicateProvider(null);
      setDuplicateNewId('');
      await fetchProviders();
      setSuccess('Provider duplicated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate provider');
    } finally {
      setIsDuplicating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Providers
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and switch between AI providers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchProviders}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Current Provider Indicator */}
      {currentProvider && (
        <Card className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <StatusBadge status="active" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Current Provider
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentProvider.name} <span className="text-slate-400">({currentProvider.id})</span>
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openEditModal(currentProvider)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </Card>
      )}

      {/* Providers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isActive={provider.id === currentProviderId}
            onSwitch={handleSwitch}
            isSwitching={switchingId === provider.id}
            onDelete={handleDelete}
            onEdit={() => openEditModal(provider)}
            onDuplicate={openDuplicateModal}
            onSpeedtest={handleSpeedtest}
            isSpeedtesting={speedtestingId === provider.id}
            speedtestResult={speedtestResults[provider.id] || null}
          />
        ))}
      </div>

      {/* Empty state */}
      {providers.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            No providers available. Make sure CC-Switch is properly configured.
          </p>
        </Card>
      )}

      {/* Add Provider Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Provider"
        size="2xl"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Provider ID
            </label>
            <input
              type="text"
              required
              value={newProvider.id}
              onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value })}
              placeholder="e.g., my-provider"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Unique identifier (alphanumeric, hyphens, underscores only)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={newProvider.name}
              onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              placeholder="e.g., My Custom Provider"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Application Type
            </label>
            <select
              value={newProvider.app}
              onChange={(e) => setNewProvider({ ...newProvider, app: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            >
              <option value="claude">Claude</option>
              <option value="codex">Codex</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              API Base URL
            </label>
            <input
              type="text"
              required
              value={newProvider.apiUrl}
              onChange={(e) => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
              placeholder="https://api.example.com"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={newProvider.apiKey}
              onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          {newProvider.app === 'codex' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <input
                type="text"
                value={newProvider.model}
                onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                placeholder="gpt-4o"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          )}
          {newProvider.app === 'claude' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Model
                </label>
                <input
                  type="text"
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  placeholder="claude-3-5-sonnet-20241022"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Haiku Model (Optional)
                </label>
                <input
                  type="text"
                  value={newProvider.haikuModel}
                  onChange={(e) => setNewProvider({ ...newProvider, haikuModel: e.target.value })}
                  placeholder="claude-3-5-haiku-20241022"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sonnet Model (Optional)
                </label>
                <input
                  type="text"
                  value={newProvider.sonnetModel}
                  onChange={(e) => setNewProvider({ ...newProvider, sonnetModel: e.target.value })}
                  placeholder="claude-3-5-sonnet-20241022"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Opus Model (Optional)
                </label>
                <input
                  type="text"
                  value={newProvider.opusModel}
                  onChange={(e) => setNewProvider({ ...newProvider, opusModel: e.target.value })}
                  placeholder="claude-3-opus-20240229"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </>
          )}
          {newProvider.app === 'gemini' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <input
                type="text"
                value={newProvider.model}
                onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                placeholder="gemini-2.0-flash"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Website URL (Optional)
            </label>
            <input
              type="text"
              value={newProvider.websiteUrl}
              onChange={(e) => setNewProvider({ ...newProvider, websiteUrl: e.target.value })}
              placeholder="https://provider-website.com"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={newProvider.notes}
              onChange={(e) => setNewProvider({ ...newProvider, notes: e.target.value })}
              placeholder="Additional notes about this provider..."
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Provider'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Provider Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
        }}
        title="Edit Provider"
        size="2xl"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Provider ID
            </label>
            <input
              type="text"
              disabled
              value={editProvider.id}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Provider ID cannot be changed
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={editProvider.name}
              onChange={(e) => setEditProvider({ ...editProvider, name: e.target.value })}
              placeholder="e.g., My Custom Provider"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Application Type
            </label>
            <select
              value={editProvider.app}
              onChange={(e) => setEditProvider({ ...editProvider, app: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            >
              <option value="claude">Claude</option>
              <option value="codex">Codex</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              API Base URL
            </label>
            <input
              type="text"
              value={editProvider.apiUrl}
              onChange={(e) => setEditProvider({ ...editProvider, apiUrl: e.target.value })}
              placeholder="https://api.example.com"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={editProvider.apiKey}
              onChange={(e) => setEditProvider({ ...editProvider, apiKey: e.target.value })}
              placeholder="Leave empty to keep existing key"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Leave empty to keep the existing API key
            </p>
          </div>
          {editProvider.app === 'codex' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <input
                type="text"
                value={editProvider.model}
                onChange={(e) => setEditProvider({ ...editProvider, model: e.target.value })}
                placeholder="gpt-4o"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          )}
          {editProvider.app === 'claude' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Model
                </label>
                <input
                  type="text"
                  value={editProvider.model}
                  onChange={(e) => setEditProvider({ ...editProvider, model: e.target.value })}
                  placeholder="claude-3-5-sonnet-20241022"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Haiku Model (Optional)
                </label>
                <input
                  type="text"
                  value={editProvider.haikuModel}
                  onChange={(e) => setEditProvider({ ...editProvider, haikuModel: e.target.value })}
                  placeholder="claude-3-5-haiku-20241022"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sonnet Model (Optional)
                </label>
                <input
                  type="text"
                  value={editProvider.sonnetModel}
                  onChange={(e) => setEditProvider({ ...editProvider, sonnetModel: e.target.value })}
                  placeholder="claude-3-5-sonnet-20241022"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Opus Model (Optional)
                </label>
                <input
                  type="text"
                  value={editProvider.opusModel}
                  onChange={(e) => setEditProvider({ ...editProvider, opusModel: e.target.value })}
                  placeholder="claude-3-opus-20240229"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </>
          )}
          {editProvider.app === 'gemini' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <input
                type="text"
                value={editProvider.model}
                onChange={(e) => setEditProvider({ ...editProvider, model: e.target.value })}
                placeholder="gemini-2.0-flash"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Website URL
            </label>
            <input
              type="text"
              value={editProvider.websiteUrl}
              onChange={(e) => setEditProvider({ ...editProvider, websiteUrl: e.target.value })}
              placeholder="https://provider-website.com"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={editProvider.notes}
              onChange={(e) => setEditProvider({ ...editProvider, notes: e.target.value })}
              placeholder="Additional notes about this provider..."
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEditing}
            >
              {isEditing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Duplicate Provider Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setDuplicateProvider(null);
          setDuplicateNewId('');
        }}
        title="Duplicate Provider"
        size="lg"
      >
        <form onSubmit={handleDuplicate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Source Provider
            </label>
            <input
              type="text"
              disabled
              value={duplicateProvider?.name || ''}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Provider ID
            </label>
            <input
              type="text"
              required
              value={duplicateNewId}
              onChange={(e) => setDuplicateNewId(e.target.value)}
              placeholder="e.g., my-provider-copy"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter a unique ID for the duplicated provider
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowDuplicateModal(false);
                setDuplicateProvider(null);
                setDuplicateNewId('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDuplicating}
            >
              {isDuplicating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Duplicating...
                </>
              ) : (
                'Duplicate'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
