import { Request, Response, RequestHandler } from 'express';
import axios from 'axios';
import User from '../models/User';
import Project from '../models/Project';
import Profile from '../models/Profile';
import GithubAccount from '../models/GithubAccount';
import redis from '../utils/redisClient';
import crypto from "crypto";
import { userActivity } from '../services/activityTracker';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
	};
}

// GitHub API response types
interface GitHubTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	token_type: string;
	scope: string;
}

interface GitHubUserResponse {
	id: number;
	login: string;
	name?: string;
	email?: string;
	avatar_url: string;
}

interface GitHubEmailEntry {
	email: string;
	primary: boolean;
	verified: boolean;
	visibility?: string | null;
}

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://codevo.live';

// GitHub OAuth URL generation
export const getGitHubAuthUrl: RequestHandler = async (req, res) => {
	try {
		const userId = (req as any).user?.id as string | undefined;
		const { projectId } = req.query as { projectId?: string };
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }
		if (!projectId) { res.status(400).json({ success:false, message:'Project ID is required' }); return; }

		// Track user activity for GitHub operations
		userActivity(projectId);

		const state = crypto.randomBytes(16).toString("hex");
		// Bind state -> current app userId and projectId with TTL 5 minutes
		const stateData = JSON.stringify({ userId, projectId });
		await redis.setex(`gh:state:${state}`, 300, stateData);


		const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user,user:email&state=${state}`;
		console.log('githubAuthUrl', githubAuthUrl);
		
		res.status(200).json({
			success: true,
			authUrl: githubAuthUrl,
			state: state
		});
	} catch (error) {
		console.error('Error generating GitHub auth URL:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to generate GitHub auth URL'
		});
	}
};

// GitHub OAuth URL generation for general account authentication (no project required)
export const getGeneralGitHubAuthUrl: RequestHandler = async (req, res) => {
	try {
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }

		const state = crypto.randomBytes(16).toString("hex");
		// Bind state -> current app userId with TTL 5 minutes (no projectId)
		const stateData = JSON.stringify({ userId, isGeneralAuth: true });
		await redis.setex(`gh:state:${state}`, 300, stateData);

		const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user,user:email&state=${state}`;
		console.log('generalGitHubAuthUrl', githubAuthUrl);
		
		res.status(200).json({
			success: true,
			authUrl: githubAuthUrl,
			state: state
		});
	} catch (error) {
		console.error('Error generating general GitHub auth URL:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to generate GitHub auth URL'
		});
	}
};

// GitHub OAuth callback handler
export const handleGitHubCallback: RequestHandler = async (req, res) => {
	try {
		const { code, state, error, error_description } = req.query as { 
			code?: string; 
			state?: string; 
			error?: string; 
			error_description?: string; 
		};
		
		// Handle GitHub authorization cancellation
		if (error === 'access_denied') {
			console.log('GitHub authorization was cancelled by user');
			
			// If we have state, try to get projectId to redirect back to IDE
			if (state) {
				try {
					const stateData = await redis.get(`gh:state:${state}`);
					await redis.del(`gh:state:${state}`);
					if (stateData) {
						const { projectId, isGeneralAuth } = JSON.parse(stateData);
						if (isGeneralAuth) {
							// For general auth, redirect back to settings page
							res.redirect(`${FRONTEND_URL}/dashboard/settings?error=cancelled`);
						} else {
							// For project-specific auth, redirect back to IDE with cancellation message
							res.redirect(`${FRONTEND_URL}/github-confirmation?error=cancelled&projectId=${projectId}`);
						}
						return;
					}
				} catch (error) {
					console.error('Error handling cancelled authorization:', error);
				}
			}
			
			// Fallback redirect to dashboard
			res.redirect(`${FRONTEND_URL}/github-confirmation?error=cancelled`);
			return;
		}
		
		// Handle normal OAuth flow
		if (!code || !state) {
			res.status(400).json({ success:false, message:'Authorization code/state is required' });
			return;
		}

		// Resolve initiating app user from redis state
		const stateData = await redis.get(`gh:state:${state}`);
		await redis.del(`gh:state:${state}`);
		if (!stateData) {
			res.status(400).json({ success:false, message:'Invalid or expired OAuth state' });
			return;
		}

		const { userId, projectId, isGeneralAuth } = JSON.parse(stateData);
		const appUser = await User.findById(userId);
		if (!appUser) {
			res.status(404).json({ success:false, message:'Initiating user not found' });
			return;
		}

		// Exchange code for access token
		const tokenResponse = await axios.post<GitHubTokenResponse>('https://github.com/login/oauth/access_token', {
			client_id: GITHUB_CLIENT_ID,
			client_secret: GITHUB_CLIENT_SECRET,
			code: code
		}, {
			headers: { 'Accept': 'application/json' }
		});

		const { access_token, refresh_token, expires_in } = tokenResponse.data as GitHubTokenResponse;
		if (!access_token) { res.status(400).json({ success:false, message:'Failed to get access token' }); return; }

		// Get GitHub user info (for account metadata only)
		const userResponse = await axios.get<GitHubUserResponse>('https://api.github.com/user', {
			headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/vnd.github.v3+json' }
		});
		const ghUser = userResponse.data as GitHubUserResponse;

		// Upsert GithubAccount for this app user + githubId
		let account = await GithubAccount.findOne({ user: appUser._id, githubId: ghUser.id.toString() });
		if (!account) {
			account = new GithubAccount({
				user: appUser._id,
				githubId: ghUser.id.toString(),
				username: ghUser.login,
				avatarUrl: ghUser.avatar_url,
				accessToken: access_token,
				refreshToken: refresh_token || '',
				tokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : (null as any),
				scopes: ['repo','user','user:email']
			});
			await account.save();
			await User.updateOne({ _id: appUser._id }, { $addToSet: { githubAccounts: account._id } });
		} else {
			account.username = ghUser.login;
			account.avatarUrl = ghUser.avatar_url;
			account.accessToken = access_token;
			account.refreshToken = refresh_token || '';
			account.tokenExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : (null as any);
			await account.save();
		}

		// Redirect to confirmation page with account and project info
		if (isGeneralAuth) {
			// For general auth, redirect to settings page
			res.redirect(`${FRONTEND_URL}/dashboard/settings?githubConnected=true&username=${ghUser.login}`);
		} else {
			// For project-specific auth, redirect to confirmation page
			res.redirect(`${FRONTEND_URL}/github-confirmation?accountId=${account._id}&projectId=${projectId}&username=${ghUser.login}`);
		}
	} catch (error) {
		console.error('GitHub callback error:', error);
		res.redirect(`${FRONTEND_URL}/github-confirmation?error=true`);
	}
};

// Get user's GitHub repositories using a chosen account
export const getGitHubRepositories: RequestHandler = async (req, res) => {
	try {
		const userId = (req as any).user?.id as string | undefined;
		const { accountId, projectId } = req.query as any;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }

		// Track user activity for GitHub operations
		if (projectId) {
			userActivity(projectId);
		}

		const account = await GithubAccount.findOne({ _id: accountId, user: userId });
		if (!account) { res.status(404).json({ success:false, message:'GitHub account not found' }); return; }

		const response = await axios.get('https://api.github.com/user/repos', {
			headers: {
				'Authorization': `Bearer ${account.accessToken}`,
				'Accept': 'application/vnd.github.v3+json'
			},
			params: { sort:'updated', per_page: 100 }
		});

		res.status(200).json({ success:true, repositories: response.data });
	} catch (error) {
		console.error('Error fetching GitHub repositories:', error);
		res.status(500).json({ success:false, message:'Failed to fetch repositories' });
	}
};

// Create a new GitHub repository for the selected account
export const createRepository: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    const { accountId, name, isPrivate, projectId } = req.body as { accountId: string; name: string; isPrivate?: boolean; projectId?: string };
    if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }
    if (!accountId || !name) { res.status(400).json({ success:false, message:'accountId and name are required' }); return; }

    // Track user activity for GitHub operations
    if (projectId) {
        userActivity(projectId);
    }

    const account = await GithubAccount.findOne({ _id: accountId, user: userId });
    if (!account) { res.status(404).json({ success:false, message:'GitHub account not found' }); return; }

    // Attempt to create repository
    const resp = await axios.post('https://api.github.com/user/repos', {
      name,
      private: !!isPrivate,
      auto_init: true
    }, {
      headers: { 'Authorization': `Bearer ${account.accessToken}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    res.status(200).json({ success:true, repository: resp.data });
  } catch (error: any) {
    // If repo exists, return conflict with hint
    const status = error?.response?.status;
    if (status === 422) {
      res.status(409).json({ success:false, message:'Repository with this name already exists' });
      return;
    }
    console.error('Error creating repository:', error?.response?.data || error?.message || error);
    res.status(500).json({ success:false, message:'Failed to create repository' });
  }
};

// Get connected GitHub accounts for current user
export const getMyGithubAccounts: RequestHandler = async (req, res) => {
	try {
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }
		const accounts = await GithubAccount.find({ user: userId }).select('_id username avatarUrl githubId createdAt');
		res.status(200).json({ success:true, accounts });
	} catch (e) {
		res.status(500).json({ success:false, message:'Failed to fetch GitHub accounts' });
	}
};

// Connect project to GitHub repository using a chosen account
export const connectRepository: RequestHandler = async (req, res) => {
	try {
		const { projectId, repositoryId, repositoryName, repositoryUrl, accountId } = req.body as any;
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }

		// Track user activity for GitHub operations
		if (projectId) {
			userActivity(projectId);
		}

		const account = await GithubAccount.findOne({ _id: accountId, user: userId });
		if (!account) { res.status(404).json({ success:false, message:'GitHub account not found' }); return; }

		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		const isOwner = project.collaborators.some(c => c.user.toString() === userId && c.role === 'owner');
		if (!isOwner) { res.status(403).json({ success:false, message:'Only project owners can connect repositories' }); return; }

		project.github = {
			repositoryId,
			repositoryName,
			repositoryUrl,
			defaultBranch: 'main',
			isConnected: true,
			lastSyncAt: new Date(),
			account: account._id
		};
		await project.save();

		res.status(200).json({ success:true, message:'Repository connected successfully' });
	} catch (error) {
		console.error('Error connecting repository:', error);
		res.status(500).json({ success:false, message:'Failed to connect repository' });
	}
};

// Disconnect repository
export const disconnectRepository: RequestHandler = async (req, res) => {
	try {
		const { projectId } = req.body as any;
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }

		// Track user activity for GitHub operations
		if (projectId) {
			userActivity(projectId);
		}

		const project = await Project.findOne({ projectId });
		if (!project) { res.status(404).json({ success:false, message:'Project not found' }); return; }

		const isOwner = project.collaborators.some(c => c.user.toString() === userId && c.role === 'owner');
		if (!isOwner) { res.status(403).json({ success:false, message:'Only project owners can disconnect repositories' }); return; }

		project.github = {
			repositoryId: '',
			repositoryName: '',
			repositoryUrl: '',
			defaultBranch: 'main',
			isConnected: false,
			lastSyncAt: null as any,
			account: null as any
		};
		await project.save();

		res.status(200).json({ success:true, message:'Repository disconnected successfully' });
	} catch (error) {
		console.error('Error disconnecting repository:', error);
		res.status(500).json({ success:false, message:'Failed to disconnect repository' });
	}
};

// Get GitHub connection status (accounts list)
export const getGitHubStatus: RequestHandler = async (req, res) => {
	try {
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }
		const accounts = await GithubAccount.find({ user: userId }).select('_id username avatarUrl githubId');
		
		// Return format that frontend expects
		const isConnected = accounts.length > 0;
		const username = accounts.length > 0 ? accounts[0].username : '';
		
		res.status(200).json({ 
			success: true, 
			isConnected,
			username,
			accounts, // Keep for future use
			hasAny: accounts.length > 0 
		});
	} catch (error) {
		console.error('Error getting GitHub status:', error);
		res.status(500).json({ success:false, message:'Failed to get GitHub status' });
	}
};

// Disconnect all GitHub accounts (optional)
export const disconnectGitHub: RequestHandler = async (req, res) => {
	try {
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }
		await GithubAccount.deleteMany({ user: userId });
		await User.updateOne({ _id: userId }, { $set: { githubAccounts: [] } });
		res.status(200).json({ success:true, message:'GitHub accounts disconnected successfully' });
	} catch (error) {
		console.error('Error disconnecting GitHub:', error);
		res.status(500).json({ success:false, message:'Failed to disconnect GitHub' });
	}
};
