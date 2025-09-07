const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://server.codevo.live/api/v1';

// Helper function to get runner URL for a project
export const getRunnerUrl = (projectId: string) => `https://${projectId}.codevo.live`;

export const authEndpoints = {
    LOGIN_API : BASE_URL + '/auth/login',
    VERIFY_SIGNUP_API : BASE_URL + '/auth/verifySignup',
    SENDOTP_API : BASE_URL + '/auth/sendotp',
    VERIFY_OTP_API : BASE_URL + '/auth/verifyOTP',
    // RESET_PASS_TOKEN_API : BASE_URL + '/auth/reset-password-token',
    // RESET_PASS_API : BASE_URL + '/auth/reset-password',
    CHANGEPASS_API : BASE_URL + '/auth/changepassword',
    USER_DETAILS_API : BASE_URL + '/auth/getDetails',
    COMMIT_STATS_API : BASE_URL + '/auth/commit-stats',
    PROFILE_API : BASE_URL + '/auth/profile',
    LOGOUT_API : BASE_URL + '/auth/logout'
}


export const projectEndPoints = {
    COPY_PROJECT_API : BASE_URL + '/copyProject',
    CREATE_PROJECT_API : BASE_URL + '/createProject',
    GET_TEMPLATES_API : BASE_URL + '/getTemplates',
    GET_PROJECT_DETAILS_API : BASE_URL + '/project',
    GET_PROJECT_STATUS_API : BASE_URL + '/projectStatus',
    JOIN_PROJECT_API : BASE_URL + '/joinProject',
    UPDATE_PROJECT_API : BASE_URL + '/updateDescription',
    DELETE_PROJECT_API : BASE_URL + '/deleteProject',
}

export const invitationEndPoints = {
    CREATE_INVITATION_API : BASE_URL + '/invite/create',
    GET_INVITATION_DETAILS_API : BASE_URL + '/invite/details',
    ACCEPT_INVITATION_API : BASE_URL + '/invite/accept',
    MANAGE_INVITATIONS_API : BASE_URL + '/invite/manage',
    REVOKE_INVITATION_API : BASE_URL + '/invite/revoke',
    REMOVE_COLLABORATOR_API : BASE_URL + '/invite/removeCollaborator'
}

export const githubEndPoints = {
    GET_AUTH_URL_API : BASE_URL + '/github/auth/url',
    GET_GENERAL_AUTH_URL_API : BASE_URL + '/github/auth/general',
    GET_REPOSITORIES_API : BASE_URL + '/github/repositories',
    CREATE_REPOSITORY_API : BASE_URL + '/github/create-repository',
    CONNECT_REPOSITORY_API : BASE_URL + '/github/connect-repository',
    DISCONNECT_REPOSITORY_API : BASE_URL + '/github/disconnect-repository',
    GET_STATUS_API : BASE_URL + '/github/status',
    DISCONNECT_GITHUB_API : BASE_URL + '/github/disconnect',
    PUSH_CHANGES_API : BASE_URL + '/github/push',
    PULL_CHANGES_API : BASE_URL + '/github/pull',
    GET_REPOSITORY_STATUS_API : BASE_URL + '/github/repository-status',
    CHECK_REPOSITORY_API : BASE_URL + '/github/check-repository',
    INITIALIZE_REPOSITORY_API : BASE_URL + '/github/initialize-repository',
    RECOVER_REPOSITORY_API : BASE_URL + '/github/recover-repository',
    CHECK_AND_RESTORE_REPOSITORY_API : BASE_URL + '/github/check-and-restore-repository',
    CONFIGURE_GIT_USER_API : BASE_URL + '/github/configure-git-user',
    STAGE_FILES_API : BASE_URL + '/github/stage-files',
    UNSTAGE_FILES_API : BASE_URL + '/github/unstage-files',
    COMMIT_CHANGES_NEW_API : BASE_URL + '/github/commit-changes'
}

export const AIEndPoints = {
    GET_LATEST_CHAT_SESSION_API : BASE_URL + '/ai/latest',
    CREATE_NEW_CHAT_SESSION_API : BASE_URL + '/ai/new',
    CHAT_API : BASE_URL + '/ai/chat',
    LIST_CHAT_SESSIONS_API : BASE_URL + '/ai/sessions',
    GET_CHAT_SESSION_BY_ID_API : BASE_URL + '/ai/getSession',
}

export const ExplanationEndPoints = {
    GET_LATEST_EXPLAIN_SESSION_API : BASE_URL + '/explain/latest',
    CREATE_NEW_EXPLAIN_SESSION_API : BASE_URL + '/explain/new',
    EXPLAIN_CHAT_API : BASE_URL + '/explain/chat',
    LIST_EXPLAIN_SESSIONS_API : BASE_URL + '/explain/sessions',
    GET_EXPLAIN_SESSION_BY_ID_API : BASE_URL + '/explain/getSession',
}

export const PasswordResetEndPoints = {
    GENERATE_CHANGE_TOKEN_API : BASE_URL + '/password-reset/generate-change-token',
    VALIDATE_CHANGE_TOKEN_API : BASE_URL + '/password-reset/validate-change-token',
    CHANGE_PASSWORD_API : BASE_URL + '/password-reset/change-password',
    GENERATE_FORGOT_TOKEN_API : BASE_URL + '/password-reset/generate-forgot-token',
    RESET_PASSWORD_API : BASE_URL + '/password-reset/reset-password',
}