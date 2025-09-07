import express from 'express';
import {
    getGitHubAuthUrl,
    getGeneralGitHubAuthUrl,
    handleGitHubCallback,
    getGitHubRepositories,
    createRepository,
    connectRepository,
    disconnectRepository,
    getGitHubStatus,
    disconnectGitHub,
    getMyGithubAccounts
} from '../controllers/GitHubAuth';
import {
    pushChanges,
    pullChanges,
    getRepositoryStatus,
    checkGitRepository,
    initializeGitRepository,
    recoverGitRepository,
    checkAndRestoreGitRepository,
    configureGitUser,
    stageFiles,
    unstageFiles,
    commitStagedChanges
} from '../controllers/GitOperations';
import { auth } from '../middleware/auth';
import { requireGithubAccount } from '../middleware/github';

const router = express.Router();

// GitHub OAuth routes
router.get('/auth/url', auth, getGitHubAuthUrl);
router.get('/auth/general', auth, getGeneralGitHubAuthUrl);
router.get('/auth/callback', handleGitHubCallback);

// GitHub account management routes
router.get('/accounts', auth, getMyGithubAccounts);
router.get('/status', auth, getGitHubStatus);
router.post('/disconnect', auth, requireGithubAccount, disconnectGitHub);

// GitHub repository management routes
router.get('/repositories', auth, requireGithubAccount, getGitHubRepositories);
router.post('/create-repository', auth, requireGithubAccount, createRepository);
router.post('/connect-repository', auth, requireGithubAccount, connectRepository);
router.post('/disconnect-repository', auth, requireGithubAccount, disconnectRepository);

// Git operations routes
router.post('/push', auth, requireGithubAccount, pushChanges);
router.post('/pull', auth, requireGithubAccount, pullChanges);
router.get('/repository-status/:projectId', auth, requireGithubAccount, getRepositoryStatus);
router.get('/check-repository/:projectId', auth, requireGithubAccount, checkGitRepository);
router.post('/initialize-repository/:projectId', auth, requireGithubAccount, initializeGitRepository);
router.post('/recover-repository/:projectId', auth, requireGithubAccount, recoverGitRepository);
router.post('/check-and-restore-repository/:projectId', auth, requireGithubAccount, checkAndRestoreGitRepository);
router.post('/configure-git-user', auth, requireGithubAccount, configureGitUser);
router.post('/stage-files/:projectId', auth, requireGithubAccount, stageFiles);
router.post('/unstage-files/:projectId', auth, requireGithubAccount, unstageFiles);
router.post('/commit-changes/:projectId', auth, requireGithubAccount, commitStagedChanges);

export default router;
