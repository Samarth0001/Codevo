import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Github,
  GitBranch,
  RefreshCw,
  Check,
  Plus,
  Edit3,
  Minus,
  FileText,
  CheckCircle,
  GitCommit
} from 'lucide-react';
import { GitHubAPI } from '@/services/operations/GitHubAPI';
import { toast } from 'react-hot-toast';

interface UnifiedVersionControlProps {
  projectId?: string;
}

type GitFile = {
  path: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  modified: boolean;
  deleted: boolean;
  added?: boolean;
  renamed?: boolean;
  type: 'file' | 'folder';
};

type GitStatus = {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFile[];
  hasChanges: boolean;
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
  hasUntrackedFiles: boolean;
  rawStatus?: string;
};



const UnifiedVersionControl: React.FC<UnifiedVersionControlProps> = ({ projectId }) => {
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [hasGitRepository, setHasGitRepository] = useState<boolean | null>(null);
  const [isRepoConnected, setIsRepoConnected] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [showRepoSelect, setShowRepoSelect] = useState<boolean>(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [showStagedOpen, setShowStagedOpen] = useState(true);
  const [showUnstagedOpen, setShowUnstagedOpen] = useState(true);
  const [isCorruptedGit, setIsCorruptedGit] = useState(false);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const checkRepositoryPresence = async () => {
    if (!projectId) { setHasGitRepository(null); return; }
    try {
      setIsLoading(true);
      const resp = await GitHubAPI.checkGitRepository(projectId);
      if (resp?.success) {
        setHasGitRepository(!!resp.hasGitRepository);
      } else {
        setHasGitRepository(false);
      }
    } catch (e) {
      setHasGitRepository(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkGitStatus = async () => {
    if (!projectId) return;
    let repoExists: boolean | null = hasGitRepository;
    try {
      setIsLoading(true);
      const response = await GitHubAPI.getLocalGitStatus(projectId);
      const status = response.gitStatus as any;
      

      
      // If we receive any status payload, treat repo as present even if the flag is wrong
      const detectedHasRepo = !!status || !!response.hasGitRepository;
      repoExists = detectedHasRepo;
      setHasGitRepository(detectedHasRepo);
      // Use the backend parsed files
      if (status && Array.isArray(status.files)) {
        const files = status.files as GitFile[];
        setGitStatus({
          branch: status?.branch || '',
          ahead: status?.ahead || 0,
          behind: status?.behind || 0,
          files,
          hasChanges: files.length > 0,
          hasStagedChanges: files.some((f) => f.staged),
          hasUnstagedChanges: files.some((f) => !f.staged && !f.untracked),
          hasUntrackedFiles: files.some((f) => f.untracked),
          rawStatus: status?.rawStatus || (typeof status === 'string' ? status : undefined),
        });
      } else {
        setGitStatus({
          branch: '',
          ahead: 0,
          behind: 0,
          files: [],
          hasChanges: false,
          hasStagedChanges: false,
          hasUnstagedChanges: false,
          hasUntrackedFiles: false,
          rawStatus: undefined,
        });
      }
    } catch (e) {
      repoExists = false;
      setHasGitRepository(false);
      setGitStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkGitHubStatus = async () => {
    try {
      setIsLoading(true);
      const response = await GitHubAPI.getStatus();
      setIsGitHubConnected(response.success && response.isConnected);
      if (response.success && response.accounts && response.accounts.length > 0) {
        setGithubUsername(response.accounts[0].username);
        setAccounts(response.accounts);
      } else if (response.username) {
        setGithubUsername(response.username);
        setAccounts(response.accounts || []);
      } else {
        setGithubUsername('');
        setAccounts([]);
      }
    } catch (e) {
      setIsGitHubConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = async () => {
    setIsCorruptedGit(false); // Reset corrupted state on refresh
    await Promise.all([checkGitHubStatus(), checkRepositoryPresence()]);
    // Check git status after we know if repository exists
    await checkGitStatus();
    // Check repository connection status
    try {
      if (projectId) {
        const repoResp = await GitHubAPI.getRepositoryStatus(projectId);
        setIsRepoConnected(!!repoResp?.success && !!repoResp?.repository?.name);
      } else {
        setIsRepoConnected(false);
      }
    } catch {
      setIsRepoConnected(false);
    }
  };

  const handleGitHubAuth = async () => {
    try {
      if (!projectId) { toast.error('Project ID is required'); return; }
      const response = await GitHubAPI.getAuthUrl(projectId);
      if (response.success && response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        toast.error('Failed to get GitHub auth URL');
      }
    } catch (e) {
      toast.error('Failed to initiate GitHub authentication');
    }
  };

  const safeFiles: GitFile[] = useMemo(() => {
    return gitStatus && Array.isArray((gitStatus as any).files) ? (gitStatus as any).files : [];
  }, [gitStatus]);

  const handleStageAll = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      // Stage all files that are in the changes section (unstaged modifications and untracked files)
      const filesToStage = [...changesFiles];
      if (filesToStage.length === 0) { toast('Nothing to stage'); return; }
      // Stage explicit file paths to avoid environment issues with '.'
      const paths = Array.from(new Set(filesToStage.map(f => f.path)));
      await GitHubAPI.stageLocalFiles(projectId, paths);
      toast.success(`Staged ${paths.length} file(s)`);
      await checkGitStatus();
    } catch (e) {
      toast.error('Failed to stage files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!projectId) return;
    if (!commitMessage.trim()) { toast.error('Please enter a commit message'); return; }
    try {
      setIsCommitting(true);
      // Ensure git user is configured in runner (safe to call repeatedly)
      try {
        const accountId = accounts?.[0]?._id;
        if (accountId) {
          await GitHubAPI.configureLocalGitUser(projectId, { accountId });
        }
      } catch {}
      await GitHubAPI.commitLocalChanges(projectId, commitMessage.trim());
      toast.success('Changes committed successfully');
      setCommitMessage('');
      
      // Force refresh Git status after commit to ensure we get the latest state
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure commit is processed
      await checkGitStatus();
      
      // Also refresh repository connection status
      try {
        if (projectId) {
          const repoResp = await GitHubAPI.getRepositoryStatus(projectId);
          setIsRepoConnected(!!repoResp?.success && !!repoResp?.repository?.name);
        }
      } catch {
        setIsRepoConnected(false);
      }
    } catch (e) {
      toast.error('Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSync = async () => {
    if (!projectId) return;
    try {
      setIsSyncing(true);
      // If repository not connected, prompt user to select one
      if (!isRepoConnected) {
        // Load repos for first account
        let accountId: string | undefined = accounts?.[0]?._id;
        if (!accountId) {
          const status = await GitHubAPI.getStatus();
          accountId = status?.accounts?.[0]?._id;
        }
        if (!accountId) { toast.error('No GitHub account found'); return; }
        const repoListResp = await GitHubAPI.getRepositories(accountId, projectId);
        const list = repoListResp?.repositories || repoListResp?.data || [];
        setRepos(list);
        setShowRepoSelect(true);
        return;
      }

      // Basic sync strategy: pull then push
      try { await GitHubAPI.pullChanges(projectId); } catch {}
      await GitHubAPI.pushChanges(projectId);
      toast.success('Synced with GitHub');
    } catch (e) {
      toast.error('Failed to sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (file: GitFile) => {
    if (file.untracked) return <Plus className="w-4 h-4 text-green-500" />;
    if (file.deleted) return <Minus className="w-4 h-4 text-red-500" />;
    if (file.modified) return <Edit3 className="w-4 h-4 text-blue-500" />;
    if (file.renamed) return <FileText className="w-4 h-4 text-yellow-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = (file: GitFile) => {
    if (file.untracked) return <Badge variant="secondary" className="text-xs">U</Badge>;
    if (file.deleted) return <Badge variant="destructive" className="text-xs">D</Badge>;
    if (file.modified) return <Badge variant="default" className="text-xs">M</Badge>;
    if (file.renamed) return <Badge variant="outline" className="text-xs">R</Badge>;
    return <Badge variant="secondary" className="text-xs">A</Badge>;
  };

  if (hasGitRepository === null) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Checking repository status...</p>
      </div>
    );
  }

  if (!isGitHubConnected) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">GitHub Setup</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshAll} disabled={isLoading} className="text-gray-400 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="text-center py-10">
          <Github className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h4 className="text-white font-medium mb-2">Connect to GitHub</h4>
          <p className="text-gray-400 text-sm mb-4">Connect your GitHub account to enable version control features</p>
          <Button onClick={handleGitHubAuth} className="bg-green-600 hover:bg-green-700">
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub
          </Button>
        </div>
      </div>
    );
  }

  if (!hasGitRepository) {
    return (
      <div className="p-4 text-center">
        <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-white font-medium mb-2">Initialize Git Repository</h4>
        <p className="text-gray-400 text-sm mb-4">This folder doesn't currently have a Git repository. Initialize one to enable source control features.</p>
        <Button 
          onClick={async () => {
            if (!projectId) return;
            try {
              setIsInitializing(true);
              const resp = await GitHubAPI.initLocalGitRepository(projectId);
              if (resp?.success) {
                toast.success('Git repository initialized successfully');
                setIsCorruptedGit(false); // Reset corrupted state
                // Immediately re-check presence and status
                await checkRepositoryPresence();
                // Only configure user if we have GitHub connected
                if (isGitHubConnected && githubUsername) {
                  try {
                    const accountId = (await GitHubAPI.getStatus())?.accounts?.[0]?._id;
                    if (accountId) {
                      await GitHubAPI.configureLocalGitUser(projectId, { accountId });
                    }
                  } catch {}
                }
                await checkGitStatus();
              } else {
                toast.error(resp?.message || 'Failed to initialize repository');
              }
            } catch (err: any) {
              const errorData = err?.response?.data;
              if (errorData?.error === 'CORRUPTED_GIT') {
                setIsCorruptedGit(true);
                toast.error('Git repository is corrupted. Please use the terminal to run "rm -rf .git" and try again.');
              } else {
                toast.error(errorData?.message || 'Failed to initialize repository');
              }
            } finally {
              setIsInitializing(false);
            }
          }}
          disabled={isInitializing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isInitializing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Initializing...
            </>
          ) : (
            <>
              <GitBranch className="h-4 w-4 mr-2" />
              Initialize Repository
            </>
          )}
        </Button>
        
        {isCorruptedGit && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <h5 className="text-red-400 font-medium mb-2">Corrupted Git Repository Detected</h5>
            <p className="text-red-300 text-sm mb-3">
              The .git folder in your project appears to be corrupted. This can happen due to file system issues or incomplete git operations.
            </p>
            <div className="bg-gray-800 p-3 rounded border border-gray-700">
              <p className="text-gray-300 text-sm mb-2">To fix this, run the following command in the terminal:</p>
              <code className="text-green-400 text-sm bg-gray-900 px-2 py-1 rounded">rm -rf .git</code>
              <p className="text-gray-400 text-xs mt-2">Then click "Initialize Repository" again.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!gitStatus) {
    return (
      <div className="p-4 text-center">
        <GitBranch className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-400">Loading git status...</p>
      </div>
    );
  }

  const shouldHide = (p: string) => p === 'package-lock.json' || p === 'yarn.lock' || p === 'pnpm-lock.yaml' || p === 'nodemon.json' || p === 'node_modules' || p.startsWith('node_modules/');
  
  // Staged Changes: Files that are staged and ready for commit (no unstaged modifications)
  const stagedFiles = safeFiles.filter(f => {
    if (shouldHide(f.path)) return false;
    // Use the backend's staged property which now correctly determines if a file is truly staged
    return f.staged && !f.untracked;
  });
  
  // Changes: Files that are untracked, modified, deleted, or renamed (regardless of staging)
  const changesFiles = safeFiles.filter(f => {
    if (shouldHide(f.path)) return false;
    // Include untracked files
    if (f.untracked) return true;
    // Include files with unstaged changes
    if (f.unstaged) return true;
    // Include files that are not staged (this catches any edge cases)
    if (!f.staged) return true;
    return false;
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {showRepoSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-full max-w-md">
            <h4 className="text-white font-medium mb-3 flex items-center"><Github className="w-4 h-4 mr-2 text-green-500"/>Select Repository</h4>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Repository</Label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white"
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
              >
                <option value="">Select a repository</option>
                {repos.map((r: any) => {
                  const val = String((r?.id ?? r?._id ?? r?.name));
                  return (
                    <option key={val} value={val}>{r?.full_name || r?.name || val}</option>
                  );
                })}
              </select>
              <div className="flex gap-2 mt-3">
                <Button
                  className="flex-1"
                  disabled={!selectedRepoId}
                  onClick={async () => {
                    try {
                      const accountId = accounts?.[0]?._id;
                      if (!projectId || !accountId) { toast.error('Missing account'); return; }
                      const selected = repos.find((r: any) => String(r?.id ?? r?._id ?? r?.name) === selectedRepoId);
                      if (!selected) { toast.error('Select a repository'); return; }
                      const payload = {
                        projectId,
                        repositoryId: String(selected.id ?? selected._id ?? selectedRepoId),
                        repositoryName: selected.name,
                        repositoryUrl: selected.html_url || selected.url || '',
                        accountId
                      };
                      const resp = await GitHubAPI.connectRepository(payload);
                      if (resp?.success) {
                        toast.success('Repository connected');
                        setIsRepoConnected(true);
                        setShowRepoSelect(false);
                        setSelectedRepoId('');
                        // After connecting, perform sync (pull then push)
                        try { await GitHubAPI.pullChanges(projectId); } catch {}
                        await GitHubAPI.pushChanges(projectId);
                        toast.success('Synced with GitHub');
                      } else {
                        toast.error(resp?.message || 'Failed to connect repository');
                      }
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || 'Failed to connect repository');
                    }
                  }}
                >
                  Connect & Sync
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const accountId = accounts?.[0]?._id;
                      if (!projectId || !accountId) { toast.error('Missing account'); return; }
                      // Propose default name from projectId
                      const defaultName = projectId;
                      const name = prompt('Enter repository name', defaultName) || defaultName;
                      const visibility = prompt('Private repository? (yes/no)', 'no') || 'no';
                      const isPrivate = visibility.toLowerCase().startsWith('y');
                      // Try to create repo; if conflict, append suffix
                      let repoResp = await GitHubAPI.createRepository(accountId, name, isPrivate, projectId);
                      if (!repoResp?.success) {
                        // Try with projectId-based fallback
                        const fallback = defaultName;
                        repoResp = await GitHubAPI.createRepository(accountId, fallback, isPrivate, projectId);
                      }
                      const repo = repoResp?.repository;
                      if (!repo) { toast.error('Failed to create repository'); return; }
                      // Connect and sync
                      const payload = {
                        projectId,
                        repositoryId: repo.id,
                        repositoryName: repo.name,
                        repositoryUrl: repo.html_url || '',
                        accountId
                      };
                      const conn = await GitHubAPI.connectRepository(payload);
                      if (!conn?.success) { toast.error(conn?.message || 'Failed to connect repository'); return; }
                      toast.success('Repository created and connected');
                      setIsRepoConnected(true);
                      setShowRepoSelect(false);
                      setSelectedRepoId('');
                      try { await GitHubAPI.pullChanges(projectId); } catch {}
                      await GitHubAPI.pushChanges(projectId);
                      toast.success('Synced with GitHub');
                    } catch (err: any) {
                      const msg = err?.response?.data?.message || 'Failed to create repository';
                      toast.error(msg);
                    }
                  }}
                >
                  Create new repo
                </Button>
                <Button variant="outline" onClick={() => { setShowRepoSelect(false); setSelectedRepoId(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">{gitStatus.branch}</span>
            {gitStatus.ahead > 0 && (<Badge variant="outline" className="text-xs">↑{gitStatus.ahead}</Badge>)}
            {gitStatus.behind > 0 && (<Badge variant="outline" className="text-xs">↓{gitStatus.behind}</Badge>)}
            {githubUsername && (
              <span className="flex items-center text-sm text-gray-600 dark:text-gray-400 ml-2">
                <Github className="w-4 h-4 mr-1 text-green-500" />@{githubUsername}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleStageAll} disabled={isLoading || changesFiles.length === 0}>
              <Plus className="w-4 h-4 mr-1" /> Stage All
            </Button>
            <Button variant="ghost" size="sm" onClick={refreshAll} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          {stagedFiles.length > 0 && (<span className="flex items-center"><Check className="w-4 h-4 mr-1 text-green-500" />{stagedFiles.length} staged</span>)}
          {changesFiles.length > 0 && (<span className="flex items-center"><Edit3 className="w-4 h-4 mr-1 text-blue-500" />{changesFiles.length} changes</span>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setShowStagedOpen(!showStagedOpen)}>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center"><Check className="w-4 h-4 mr-2 text-green-500" />Staged Changes</h3>
              <Badge variant="outline" className="text-xs">{stagedFiles.length}</Badge>
            </div>
            {showStagedOpen && (
              <div className="px-3 pb-3 space-y-1">
                {stagedFiles.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">No staged changes</div>
                ) : (
                  stagedFiles.map(file => (
                    <div key={file.path} className="flex items-center p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      {getStatusIcon(file)}
                      <span className="ml-2 text-sm flex-1 truncate">{file.path}</span>
                      {getStatusBadge(file)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setShowUnstagedOpen(!showUnstagedOpen)}>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center"><Edit3 className="w-4 h-4 mr-2 text-blue-500" />Changes</h3>
              <Badge variant="outline" className="text-xs">{changesFiles.length}</Badge>
            </div>
            {showUnstagedOpen && (
              <div className="px-3 pb-3 space-y-1">
                {changesFiles.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">No changes</div>
                ) : (
                  changesFiles.map(file => (
                    <div key={file.path} className="flex items-center p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      {getStatusIcon(file)}
                      <span className="ml-2 text-sm flex-1 truncate">{file.path}</span>
                      {getStatusBadge(file)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          

          {!gitStatus.hasChanges && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500 mb-4">Working tree clean</p>
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          )}

        </div>
      </div>

      {gitStatus.hasStagedChanges && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commit Message</Label>
              <Input 
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message..."
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCommit} disabled={!commitMessage.trim() || isCommitting} className="flex-1">
                <GitCommit className="w-4 h-4 mr-2" />{isCommitting ? 'Committing...' : 'Commit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedVersionControl;


