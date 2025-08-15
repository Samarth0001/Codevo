const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000/api/v1' || 'http://api.codevo.dev/api/v1';

export const authEndpoints = {
    LOGIN_API : BASE_URL + '/auth/login',
    VERIFY_SIGNUP_API : BASE_URL + '/auth/verifySignup',
    SENDOTP_API : BASE_URL + '/auth/sendotp',
    VERIFY_OTP_API : BASE_URL + '/auth/verifyOTP',
    // RESET_PASS_TOKEN_API : BASE_URL + '/auth/reset-password-token',
    // RESET_PASS_API : BASE_URL + '/auth/reset-password',
    CHANGEPASS_API : BASE_URL + '/auth/changepassword',
    USER_DETAILS_API : BASE_URL + '/auth/getDetails',
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
    ACCEPT_INVITATION_API : BASE_URL + '/invite/accept'
}