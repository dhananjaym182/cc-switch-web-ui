import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Zap, Package, Power, PowerOff, FolderGit2} from 'lucide-react';
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchSkills}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setShowReposModal(true)}>
            <FolderGit2 className="w-4 h-4 mr-2" />
            Repos
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
    </div>
  );
}
