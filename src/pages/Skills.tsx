import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Zap, Package, Power, PowerOff, FolderGit2, Search, Download, Upload, Info, Settings} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { skillsApi } from '../services/api';
import { useApp } from '../contexts/AppContext';
import type { Skill, SkillRepo } from '../types';

export function Skills() {
  const { selectedApp } = useApp();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [repos, setRepos] = useState<SkillRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showReposModal, setShowReposModal] = useState(false);
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [isRemovingRepo, setIsRemovingRepo] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // New features state
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [discoveredSkills, setDiscoveredSkills] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUnmanagedModal, setShowUnmanagedModal] = useState(false);
  const [unmanagedSkills, setUnmanagedSkills] = useState<any[]>([]);
  const [isScanningUnmanaged, setIsScanningUnmanaged] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSkillInfoModal, setShowSkillInfoModal] = useState(false);
  const [skillInfo, setSkillInfo] = useState<any>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [showSyncMethodModal, setShowSyncMethodModal] = useState(false);
  const [syncMethod, setSyncMethod] = useState<'auto' | 'symlink' | 'copy'>('auto');
  const [isUpdatingSyncMethod, setIsUpdatingSyncMethod] = useState(false);
  
  // Discover skills search state
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState('');
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);

  const fetchSkills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await skillsApi.list(selectedApp);
      setSkills(response.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRepos = async () => {
    try {
      const response = await skillsApi.listRepos();
      setRepos(response.repos || []);
    } catch (err) {
      console.error('Failed to fetch skill repos:', err);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await skillsApi.search(searchQuery);
      setSearchResults(response.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search skills');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchRepos();
  }, [selectedApp]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setIsInstalling(true);
    setError(null);
    try {
      await skillsApi.install(newSkillName, selectedApp);
      setNewSkillName('');
      setShowInstallModal(false);
      setSearchResults([]);
      await fetchSkills();
      setSuccess(`Skill "${newSkillName}" installed successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install skill');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstall = async (skillName: string) => {
    if (!confirm(`Are you sure you want to uninstall skill "${skillName}"?`)) {
      return;
    }
    
    setIsUninstalling(skillName);
    setError(null);
    try {
      await skillsApi.uninstall(skillName, selectedApp);
      await fetchSkills();
      setSuccess(`Skill "${skillName}" uninstalled successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall skill');
    } finally {
      setIsUninstalling(null);
    }
  };

  const handleToggle = async (skill: Skill) => {
    setIsToggling(skill.id);
    setError(null);
    try {
      if (skill.enabled) {
        await skillsApi.disable(skill.name, selectedApp);
        setSuccess(`Skill "${skill.name}" disabled successfully`);
      } else {
        await skillsApi.enable(skill.name, selectedApp);
        setSuccess(`Skill "${skill.name}" enabled successfully`);
      }
      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${skill.enabled ? 'disable' : 'enable'} skill`);
    } finally {
      setIsToggling(null);
    }
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setIsAddingRepo(true);
    setError(null);
    try {
      await skillsApi.addRepo(newRepoUrl);
      setNewRepoUrl('');
      setShowAddRepoModal(false);
      await fetchRepos();
      setSuccess('Skill repository added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill repository');
    } finally {
      setIsAddingRepo(false);
    }
  };

  const handleRemoveRepo = async (repoFullName: string) => {
    if (!confirm(`Are you sure you want to remove repository "${repoFullName}"?`)) {
      return;
    }

    setIsRemovingRepo(repoFullName);
    setError(null);
    try {
      await skillsApi.removeRepo(repoFullName);
      await fetchRepos();
      setSuccess('Skill repository removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove skill repository');
    } finally {
      setIsRemovingRepo(null);
    }
  };

  // New feature handlers
  const handleDiscover = async () => {
    setIsDiscovering(true);
    setError(null);
    try {
      const response = await skillsApi.discover(selectedApp);
      setDiscoveredSkills(response.skills || []);
      setShowDiscoverModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover skills');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const result = await skillsApi.sync(selectedApp);
      setSuccess(result.message || 'Skills synced successfully');
      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync skills');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScanUnmanaged = async () => {
    setIsScanningUnmanaged(true);
    setError(null);
    try {
      const response = await skillsApi.scanUnmanaged(selectedApp);
      setUnmanagedSkills(response.skills || []);
      setShowUnmanagedModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan unmanaged skills');
    } finally {
      setIsScanningUnmanaged(false);
    }
  };

  const handleImportFromApps = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const result = await skillsApi.importFromApps(selectedApp);
      setSuccess(result.message || 'Skills imported successfully');
      setShowUnmanagedModal(false);
      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import skills');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkillInfo = async (skillName: string) => {
    setIsLoadingInfo(true);
    setError(null);
    try {
      const info = await skillsApi.info(skillName, selectedApp);
      setSkillInfo(info);
      setShowSkillInfoModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get skill info');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleGetSyncMethod = async () => {
    try {
      const result = await skillsApi.getSyncMethod();
      setSyncMethod(result.method || 'auto');
      setShowSyncMethodModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync method');
    }
  };

  const handleSetSyncMethod = async (method: 'auto' | 'symlink' | 'copy') => {
    setIsUpdatingSyncMethod(true);
    setError(null);
    try {
      await skillsApi.setSyncMethod(method);
      setSyncMethod(method);
      setSuccess(`Sync method set to: ${method}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set sync method');
    } finally {
      setIsUpdatingSyncMethod(false);
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
            Skills
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage extensions and capabilities
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
           <Button variant="secondary" onClick={fetchSkills}>
             <RefreshCw className="w-4 h-4 mr-2" />
             Refresh
           </Button>
           <Button variant="secondary" onClick={handleDiscover} disabled={isDiscovering}>
             {isDiscovering ? (
               <>
                 <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                 Discovering...
               </>
             ) : (
               <>
                 <Search className="w-4 h-4 mr-2" />
                 Discover
               </>
             )}
           </Button>
           <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
             <Download className="w-4 h-4 mr-2" />
             Sync
           </Button>
           <Button variant="secondary" onClick={() => setShowReposModal(true)}>
             <FolderGit2 className="w-4 h-4 mr-2" />
             Repos
           </Button>
           <Button variant="secondary" onClick={handleGetSyncMethod}>
             <Settings className="w-4 h-4 mr-2" />
             Settings
           </Button>
           <Button onClick={() => setShowInstallModal(true)}>
             <Plus className="w-4 h-4 mr-2" />
             Install Skill
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

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => (
          <Card key={skill.id} className={`hover:border-primary-500 transition-colors ${skill.enabled === false ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${skill.enabled === false ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {skill.name}
                    </h3>
                    {skill.enabled === false ? (
                      <StatusBadge status="warning" label="Disabled" />
                    ) : (
                      <StatusBadge status="success" label="Enabled" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                    {skill.id}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {skill.description || 'No description provided'}
              </p>
            </div>

            {/* Action buttons */}
             <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
               <button
                 onClick={() => handleSkillInfo(skill.name)}
                 disabled={isLoadingInfo}
                 className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                 title="Skill Info"
               >
                 <Info className="w-4 h-4" />
               </button>
               <button
                 onClick={() => handleToggle(skill)}
                 disabled={isToggling === skill.id}
                 className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                   skill.enabled === false
                     ? 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                     : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                 }`}
                 title={skill.enabled === false ? 'Enable Skill' : 'Disable Skill'}
               >
                 {isToggling === skill.id ? (
                   <RefreshCw className="w-4 h-4 animate-spin" />
                 ) : skill.enabled === false ? (
                   <PowerOff className="w-4 h-4" />
                 ) : (
                   <Power className="w-4 h-4" />
                 )}
               </button>
               <button
                 onClick={() => handleUninstall(skill.name)}
                 disabled={isUninstalling === skill.name}
                 className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                 title="Uninstall Skill"
               >
                 {isUninstalling === skill.name ? (
                   <RefreshCw className="w-4 h-4 animate-spin" />
                 ) : (
                   <Trash2 className="w-4 h-4" />
                 )}
               </button>
             </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {skills.length === 0 && (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No Skills Installed
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              You haven't installed any skills yet. Install skills to add new capabilities to your AI assistant.
            </p>
            <Button onClick={() => setShowInstallModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Install First Skill
            </Button>
          </div>
        </Card>
      )}

      {/* Install Modal */}
      <Modal
        isOpen={showInstallModal}
        onClose={() => {
          setShowInstallModal(false);
          setSearchResults([]);
          setNewSkillName('');
        }}
        title="Install Skill"
        size="lg"
      >
        <form onSubmit={handleInstall} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Skill Name
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => {
                  setNewSkillName(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                placeholder="e.g., browser-tools"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                autoFocus
              />
              <Button type="button" onClick={handleSearch} disabled={isSearching || !newSkillName}>
                Search
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((result: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    onClick={() => setNewSkillName(result.name)}
                  >
                    <div className="font-medium text-slate-900 dark:text-white">{result.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{result.description}</div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter the name of the skill or search to find available skills.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowInstallModal(false);
                setSearchResults([]);
                setNewSkillName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newSkillName.trim() || isInstalling}
            >
              {isInstalling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                'Install'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Repos Management Modal */}
      <Modal
        isOpen={showReposModal}
        onClose={() => setShowReposModal(false)}
        title="Skill Repositories"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage skill repositories to discover and install new skills.
            </p>
            <Button size="sm" onClick={() => setShowAddRepoModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Repo
            </Button>
          </div>

          {repos.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No skill repositories configured</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowAddRepoModal(true)}>
                Add your first repository
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {repos.map((repo) => (
                <div
                  key={`${repo.owner}/${repo.name}`}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {repo.owner}/{repo.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Branch: {repo.branch}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {repo.enabled ? (
                      <StatusBadge status="success" label="Enabled" />
                    ) : (
                      <StatusBadge status="warning" label="Disabled" />
                    )}
                    <button
                      onClick={() => handleRemoveRepo(`${repo.owner}/${repo.name}`)}
                      disabled={isRemovingRepo === `${repo.owner}/${repo.name}`}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                      title="Remove Repository"
                    >
                      {isRemovingRepo === `${repo.owner}/${repo.name}` ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setShowReposModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Repo Modal */}
      <Modal
        isOpen={showAddRepoModal}
        onClose={() => {
          setShowAddRepoModal(false);
          setNewRepoUrl('');
        }}
        title="Add Skill Repository"
      >
        <form onSubmit={handleAddRepo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Repository URL
            </label>
            <input
              type="text"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              placeholder="e.g., https://github.com/owner/skills-repo"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              autoFocus
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter the GitHub repository URL or owner/repo format.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddRepoModal(false);
                setNewRepoUrl('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newRepoUrl.trim() || isAddingRepo}
            >
              {isAddingRepo ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Repository'
              )}
            </Button>
          </div>
        </form>
       </Modal>

      {/* Discover Skills Modal */}
      <Modal
        isOpen={showDiscoverModal}
        onClose={() => {
          setShowDiscoverModal(false);
          setDiscoveredSkills([]);
          setDiscoverSearchQuery('');
        }}
        title="Discover Skills"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Available skills from enabled repositories:
          </p>
          
          {/* Search input for discovered skills */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={discoverSearchQuery}
              onChange={(e) => setDiscoverSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          
          {discoveredSkills.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No skills found in repositories</p>
              <p className="text-xs mt-2">Add repositories to discover new skills</p>
            </div>
          ) : (
            <>
              {/* Show count of filtered results */}
              {discoverSearchQuery && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {discoveredSkills.filter((skill: any) => 
                    skill.name.toLowerCase().includes(discoverSearchQuery.toLowerCase()) ||
                    (skill.description && skill.description.toLowerCase().includes(discoverSearchQuery.toLowerCase()))
                  ).length} of {discoveredSkills.length} skills
                </p>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {discoveredSkills
                  .filter((skill: any) => 
                    !discoverSearchQuery || 
                    skill.name.toLowerCase().includes(discoverSearchQuery.toLowerCase()) ||
                    (skill.description && skill.description.toLowerCase().includes(discoverSearchQuery.toLowerCase()))
                  )
                  .map((skill: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate">{skill.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{skill.description}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {skill.installed || skills.some(s => s.name === skill.name || s.id === skill.name) ? (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Installed
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={installingSkill === skill.name}
                            onClick={async () => {
                              setInstallingSkill(skill.name);
                              try {
                                await skillsApi.install(skill.name, selectedApp);
                                setSuccess(`Skill "${skill.name}" installed successfully`);
                                // Refresh discovered skills
                                const response = await skillsApi.discover(selectedApp);
                                setDiscoveredSkills(response.skills || []);
                                await fetchSkills();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to install skill');
                              } finally {
                                setInstallingSkill(null);
                              }
                            }}
                          >
                            {installingSkill === skill.name ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Installing...
                              </>
                            ) : (
                              'Install'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="secondary" onClick={handleScanUnmanaged} disabled={isScanningUnmanaged}>
              <Upload className="w-4 h-4 mr-2" />
              Scan Unmanaged
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowDiscoverModal(false);
              setDiscoverSearchQuery('');
            }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unmanaged Skills Modal */}
      <Modal
        isOpen={showUnmanagedModal}
        onClose={() => {
          setShowUnmanagedModal(false);
          setUnmanagedSkills([]);
        }}
        title="Unmanaged Skills"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Skills found in app directories that are not managed by cc-switch:
          </p>
          
          {unmanagedSkills.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No unmanaged skills found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {unmanagedSkills.map((skill: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{skill.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs">
                      {skill.path}
                    </div>
                    <div className="text-xs text-slate-400">App: {skill.app}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShowUnmanagedModal(false)}>
              Close
            </Button>
            {unmanagedSkills.length > 0 && (
              <Button onClick={handleImportFromApps} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import All
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Skill Info Modal */}
      <Modal
        isOpen={showSkillInfoModal}
        onClose={() => {
          setShowSkillInfoModal(false);
          setSkillInfo(null);
        }}
        title="Skill Information"
      >
        <div className="space-y-4">
          {skillInfo ? (
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Name:</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{skillInfo.name}</span>
                  </div>
                  {skillInfo.description && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Description:</span>
                      <span className="text-sm text-slate-900 dark:text-white">{skillInfo.description}</span>
                    </div>
                  )}
                  {skillInfo.version && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Version:</span>
                      <span className="text-sm text-slate-900 dark:text-white">{skillInfo.version}</span>
                    </div>
                  )}
                  {skillInfo.author && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Author:</span>
                      <span className="text-sm text-slate-900 dark:text-white">{skillInfo.author}</span>
                    </div>
                  )}
                  {skillInfo.path && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Path:</span>
                      <span className="text-sm font-mono text-slate-900 dark:text-white truncate max-w-xs" title={skillInfo.path}>
                        {skillInfo.path}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Installed:</span>
                    <span className={`text-sm ${skillInfo.installed ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                      {skillInfo.installed ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Enabled:</span>
                    <span className={`text-sm ${skillInfo.enabled ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {skillInfo.enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading skill info...</p>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setShowSkillInfoModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sync Method Settings Modal */}
      <Modal
        isOpen={showSyncMethodModal}
        onClose={() => setShowSyncMethodModal(false)}
        title="Skills Sync Settings"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose how skills are synchronized to app directories:
          </p>
          
          <div className="space-y-2">
            {(['auto', 'symlink', 'copy'] as const).map((method) => (
              <label
                key={method}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  syncMethod === method
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="syncMethod"
                  value={method}
                  checked={syncMethod === method}
                  onChange={() => handleSetSyncMethod(method)}
                  disabled={isUpdatingSyncMethod}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white capitalize">{method}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {method === 'auto' && 'Automatically choose the best method (symlink on Unix, copy on Windows)'}
                    {method === 'symlink' && 'Create symbolic links (requires admin on Windows)'}
                    {method === 'copy' && 'Copy files to app directories'}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="secondary" onClick={handleScanUnmanaged} disabled={isScanningUnmanaged}>
              <Upload className="w-4 h-4 mr-2" />
              Scan Unmanaged
            </Button>
            <Button variant="secondary" onClick={() => setShowSyncMethodModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
     </div>
   );
 }
