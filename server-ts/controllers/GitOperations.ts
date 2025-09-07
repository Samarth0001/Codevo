import { Request, Response, RequestHandler } from 'express';
import axios from 'axios';
import User from '../models/User';
import Project from '../models/Project';
import GithubAccount from '../models/GithubAccount';
import { getRunnerUrl } from '../utils/runnerUrl';
import { userActivity } from '../services/activityTracker';
import { trackCommit } from '../utils/commitTracker';

// Type definitions for runner API responses
interface GitStatusResponse {
	success: boolean;
	hasGitRepository: boolean;
	gitStatus: string | null;
}

interface GitInitResponse {
	success: boolean;
	message: string;
	gitStatus: string;
}

export const pushChanges: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.body as any;

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Ensure remote and upstream branch configuration
		if (project.github?.repositoryUrl) {
			const account = (req as any).githubAccount as any;
			await axios.post(`${getRunnerUrl(projectId)}/api/git/ensure-remote`, {
				url: project.github.repositoryUrl,
				branch: project.github.defaultBranch || 'main',
				token: account?.accessToken,
			}, { timeout: 20000 });
		}

		const resp = await axios.post(`${getRunnerUrl(projectId)}/api/git/push`, {
			branch: project.github?.defaultBranch || 'main'
		}, { timeout: 20000 });
		const msg = (resp as any)?.data?.message || 'Pushed successfully';
		res.status(200).json({ success: true, message: msg });
	} catch (error: any) {
		console.error('Error pushing changes:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to push changes'
		});
	}
};

export const pullChanges: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.body as any;

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		const project = await Project.findOne({ projectId });
		if (!project) {
			res.status(404).json({
				success: false,
				message: 'Project not found'
			});
			return;
		}

		// Ensure remote and upstream branch configuration
		if (project.github?.repositoryUrl) {
			const account = (req as any).githubAccount as any;
			await axios.post(`${getRunnerUrl(projectId)}/api/git/ensure-remote`, {
				url: project.github.repositoryUrl,
				branch: project.github.defaultBranch || 'main',
				token: account?.accessToken
			}, { timeout: 20000 });
		}

		// Call runner to perform git pull
		const response = await axios.post(`${getRunnerUrl(projectId)}/api/git/pull`, {
			branch: project.github?.defaultBranch || 'main'
		}, { timeout: 30000 });
		const msg = (response as any)?.data?.message || 'Pulled successfully';

		res.status(200).json({
			success: true,
			message: msg
		});
	} catch (error: any) {
		console.error('Error pulling changes:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to pull changes'
		});
	}
};

export const getRepositoryStatus: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };
		const account = (req as any).githubAccount as any;

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		const project = await Project.findOne({ projectId });
		if (!project) {
			res.status(404).json({
				success: false,
				message: 'Project not found'
			});
			return;
		}

		if (!project.github?.isConnected) {
			res.status(200).json({
				success: true,
				message: 'Project is not connected to GitHub'
			});
			return;
		}

		let latestCommit: any = null;
		try {
			const commitsResponse = await axios.get(
				`https://api.github.com/repos/${account.username}/${project.github.repositoryName}/commits`,
				{ headers: { 'Authorization': `Bearer ${account.accessToken}`, 'Accept': 'application/vnd.github.v3+json' }, params: { per_page: 1 } }
			);
			latestCommit = (commitsResponse.data as any)[0];
		} catch (e: any) {
			if (String(e?.response?.status) !== '409') {
				throw e;
			}
			// 409: empty repository; leave latestCommit as null
		}

		res.status(200).json({
			success: true,
			repository: {
				name: project.github.repositoryName,
				url: project.github.repositoryUrl,
				defaultBranch: project.github.defaultBranch,
				lastSyncAt: project.github.lastSyncAt,
				latestCommit: {
					sha: latestCommit?.sha,
					message: latestCommit?.commit?.message,
					author: latestCommit?.commit?.author?.name,
					date: latestCommit?.commit?.author?.date
				}
			}
		});
	} catch (error: any) {
		console.error('Error getting repository status:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to get repository status'
		});
	}
};

// Check if Git repository exists in the project
export const checkGitRepository: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		// Check if .git directory exists
		const response = await axios.get<GitStatusResponse>(`${getRunnerUrl(projectId)}/api/git/status`, {
			timeout: 10000
		});

		res.status(200).json({ 
			success: true, 
			hasGitRepository: response.data.hasGitRepository,
			gitStatus: response.data.gitStatus || null
		});
	} catch (error: any) {
		console.error('Error checking Git repository:', error);
		// If the request fails, assume no Git repository exists
		res.status(200).json({ 
			success: true, 
			hasGitRepository: false,
			gitStatus: null
		});
	}
};

// Initialize Git repository in the project
export const initializeGitRepository: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		// First, try to check if there's a working git repository
		try {
			const statusResponse = await axios.get<GitStatusResponse>(`${getRunnerUrl(projectId)}/api/git/status`, {
				timeout: 5000
			});
			// If git status works, repository is fine
			if (statusResponse.data.hasGitRepository) {
				res.status(200).json({ 
					success: true, 
					message: 'Git repository already exists and is working',
					gitStatus: statusResponse.data.gitStatus
				});
				return;
			}
		} catch (statusError: any) {
			// If git status fails, there might be a corrupted .git folder
			console.log('Git status check failed, this might indicate a corrupted repository:', statusError.message);
		}

		// Try to initialize Git repository
		try {
			const response = await axios.post<GitInitResponse>(`${getRunnerUrl(projectId)}/api/git/init`, {}, {
				timeout: 10000
			});

			res.status(200).json({ 
				success: true, 
				message: 'Git repository initialized successfully',
				gitStatus: response.data.gitStatus
			});
		} catch (initError: any) {
			// If init fails, it might be due to corrupted .git folder
			console.error('Git init failed:', initError.response?.data || initError.message);
			// Check if the error indicates a corrupted index
			const errorMessage = initError.response?.data?.details || initError.message;
			if (errorMessage && errorMessage.includes('index file corrupt')) {
				res.status(400).json({ 
					success: false, 
					message: 'Git repository is corrupted. Please remove the .git folder manually and try again.',
					error: 'CORRUPTED_GIT'
				});
			} else {
				res.status(500).json({ 
					success: false, 
					message: 'Failed to initialize Git repository' 
				});
			}
		}
	} catch (error: any) {
		console.error('Error initializing Git repository:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to initialize Git repository' 
		});
	}
};

// Recover corrupted Git repository
export const recoverGitRepository: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		console.log(`[GitOperations] Attempting to recover Git repository for project ${projectId}`);

		// Call runner to recover Git repository
		const response = await axios.post(`${getRunnerUrl(projectId)}/api/git/recover`, {}, {
			timeout: 30000
		});

		res.status(200).json({ 
			success: true, 
			message: (response.data as any)?.message || 'Git repository recovered successfully'
		});
	} catch (error: any) {
		console.error('Error recovering Git repository:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to recover Git repository' 
		});
	}
};

// Check and restore Git repository on project startup
export const checkAndRestoreGitRepository: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		console.log(`[GitOperations] Checking Git repository status for project ${projectId}`);

		// First check if Git repository exists and is valid
		try {
			const statusResponse = await axios.get(`${getRunnerUrl(projectId)}/api/git/status`, {
				timeout: 10000
			});

			if ((statusResponse.data as any).hasGitRepository) {
				// Git repository exists and is valid
				res.status(200).json({ 
					success: true, 
					message: 'Git repository is valid',
					hasGitRepository: true,
					gitStatus: (statusResponse.data as any).gitStatus
				});
				return;
			}
		} catch (statusError: any) {
			console.log(`[GitOperations] Git status check failed, repository may be corrupted:`, statusError.message);
		}

		// Git repository is corrupted or doesn't exist, try to recover
		console.log(`[GitOperations] Attempting to recover Git repository for project ${projectId}`);

		try {
			const response = await axios.post(`${getRunnerUrl(projectId)}/api/git/recover`, {}, {
				timeout: 30000
			});

			res.status(200).json({ 
				success: true, 
				message: (response.data as any)?.message || 'Git repository recovered successfully',
				hasGitRepository: true,
				recovered: true
			});
		} catch (recoveryError: any) {
			console.error('Error recovering Git repository:', recoveryError);
			res.status(500).json({ 
				success: false, 
				message: 'Failed to recover Git repository',
				hasGitRepository: false
			});
		}
	} catch (error: any) {
		console.error('Error checking Git repository:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to check Git repository' 
		});
	}
};

// Configure Git user when GitHub account is connected
export const configureGitUser: RequestHandler = async (req, res) => {
	try {
		const { projectId, accountId } = req.body as any;
		const account = (req as any).githubAccount as any;

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		// Configure Git user with GitHub account info
		const response = await axios.post(`${getRunnerUrl(projectId)}/api/git/configure-user`, {
			username: account.username,
			email: account.username + '@users.noreply.github.com' // Use GitHub's no-reply email format
		}, {
			timeout: 10000
		});

		res.status(200).json({ 
			success: true, 
			message: 'Git user configured successfully'
		});
	} catch (error: any) {
		console.error('Error configuring Git user:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to configure Git user' 
		});
	}
};

// Stage files
export const stageFiles: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };
		const { files } = req.body as { files: string[] };

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		// Stage files (filter disallowed before forwarding)
		const disallowed = new Set<string>(['.gitignore', 'nodemon.json', '.env']);
		const filtered = (files || []).filter(f => {
			const base = require('path').basename(f);
			return !disallowed.has(base) && !base.startsWith('.env.');
		});

		const response = await axios.post<{message: string}>(`${getRunnerUrl(projectId)}/api/git/stage`, { files: filtered }, {
			timeout: 10000
		});

		res.status(200).json({ 
			success: true, 
			message: response.data.message
		});
	} catch (error: any) {
		console.error('Error staging files:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to stage files' 
		});
	}
};

// Unstage files
export const unstageFiles: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };
		const { files } = req.body as { files: string[] };

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		// Unstage files
		const response = await axios.post<{message: string}>(`${getRunnerUrl(projectId)}/api/git/unstage`, { files }, {
			timeout: 10000
		});

		res.status(200).json({ 
			success: true, 
			message: response.data.message
		});
	} catch (error: any) {
		console.error('Error unstaging files:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to unstage files' 
		});
	}
};

// Commit staged changes
export const commitStagedChanges: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.params as { projectId: string };
		const { message } = req.body as { message: string };

		// Track user activity for Git operations
		if (projectId) {
			userActivity(projectId);
		}

		// Get project details
		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		// Check if user has access to this project
		const userId = (req as any).user?.id as string | undefined;
		const isCollaborator = project.collaborators.some(c => c.user.toString() === userId);
		if (!isCollaborator) { res.status(403).json({ success:false, message:'Access denied' }); return; }

		console.log('Commiting changes', message);
		// Commit staged changes
		const response = await axios.post<{message: string}>(`${getRunnerUrl(projectId)}/api/git/commit`, { message }, {
			timeout: 10000
		});
		console.log('After Commiting changes', response.data);

		// Track the commit for the user
		if (userId) {
			await trackCommit(userId);
		}

		res.status(200).json({ 
			success: true, 
			message: response.data.message
		}); 
	} catch (error: any) {
		console.error('Error committing changes:', error);
		res.status(500).json({ 
			success: false, 
			message: 'Failed to commit changes' 
		});
	}
};
