import { apiConnector } from '../apiConnector';
import { githubEndPoints } from '../apis';

export const GitHubAPI = {
    // Get GitHub OAuth URL
    getAuthUrl: async (projectId: string) => {
        try {
            const response = await apiConnector('GET', `${githubEndPoints.GET_AUTH_URL_API}?projectId=${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Get GitHub OAuth URL for general authentication (no project required)
    getGeneralAuthUrl: async () => {
        try {
            const response = await apiConnector('GET', githubEndPoints.GET_GENERAL_AUTH_URL_API);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Get user's GitHub repositories
    getRepositories: async (accountId: string, projectId?: string) => {
        try {
            const response = await apiConnector('GET', `${githubEndPoints.GET_REPOSITORIES_API}?accountId=${accountId}&projectId=${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    createRepository: async (accountId: string, name: string, isPrivate: boolean, projectId?: string) => {
        try {
            const response = await apiConnector('POST', githubEndPoints.CREATE_REPOSITORY_API, { accountId, name, isPrivate, projectId });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Connect project to GitHub repository
    connectRepository: async (data: {
        projectId: string;
        repositoryId: string;
        repositoryName: string;
        repositoryUrl: string;
        accountId: string;
    }) => {
        try {
            const response = await apiConnector('POST', githubEndPoints.CONNECT_REPOSITORY_API, data);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Disconnect repository from project
    disconnectRepository: async (projectId: string) => {
        try {
            const response = await apiConnector('POST', githubEndPoints.DISCONNECT_REPOSITORY_API, { projectId });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Get GitHub connection status
    getStatus: async () => {
        try {
            const response = await apiConnector('GET', githubEndPoints.GET_STATUS_API);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Disconnect GitHub account
    disconnectGitHub: async () => {
        try {
            const response = await apiConnector('POST', githubEndPoints.DISCONNECT_GITHUB_API);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Push changes to GitHub
    pushChanges: async (projectId: string) => {
        try {
            const response = await apiConnector('POST', githubEndPoints.PUSH_CHANGES_API, { projectId });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Pull changes from GitHub
    pullChanges: async (projectId: string) => {
        try {
            const response = await apiConnector('POST', githubEndPoints.PULL_CHANGES_API, { projectId });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Get repository status
    getRepositoryStatus: async (projectId: string) => {
        try {
            const response = await apiConnector('GET', `${githubEndPoints.GET_REPOSITORY_STATUS_API}/${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Check if Git repository exists
    checkGitRepository: async (projectId: string) => {
        try {
            const response = await apiConnector('GET', `${githubEndPoints.CHECK_REPOSITORY_API}/${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // ===== Local Git operations (via server-ts) =====
    getLocalGitStatus: async (projectId: string) => {
        try {
            const response = await apiConnector('GET', `${githubEndPoints.CHECK_REPOSITORY_API}/${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    initLocalGitRepository: async (projectId: string) => {
        try {
            const response = await apiConnector('POST', `${githubEndPoints.INITIALIZE_REPOSITORY_API}/${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    recoverLocalGitRepository: async (projectId: string) => {
        try {
            const response = await apiConnector('POST', `${githubEndPoints.RECOVER_REPOSITORY_API}/${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    checkAndRestoreLocalGitRepository: async (projectId: string) => {
        try {
            const response = await apiConnector('POST', `${githubEndPoints.CHECK_AND_RESTORE_REPOSITORY_API}/${projectId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    configureLocalGitUser: async (
        projectId: string,
        params: { accountId?: string; username?: string; email?: string }
    ) => {
        try {
            const body: any = { projectId };
            if (params?.accountId) body.accountId = params.accountId;
            if (params?.username) body.username = params.username;
            if (params?.email) body.email = params.email;
            const response = await apiConnector('POST', githubEndPoints.CONFIGURE_GIT_USER_API, body);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    stageLocalFiles: async (projectId: string, files: string[]) => {
        try {
            const response = await apiConnector('POST', `${githubEndPoints.STAGE_FILES_API}/${projectId}`, { files });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    unstageLocalFiles: async (projectId: string, files: string[]) => {
        try {
            const response = await apiConnector('POST', `${githubEndPoints.UNSTAGE_FILES_API}/${projectId}`, { files });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    commitLocalChanges: async (projectId: string, message: string) => {
        try {
            const response = await apiConnector('POST', `${githubEndPoints.COMMIT_CHANGES_NEW_API}/${projectId}`, { message });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },
};
