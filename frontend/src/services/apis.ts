const BASE_URL = import.meta.env.VITE_BASE_URL;

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
    CREATE_PROJECT_API : BASE_URL + '/createProject'
}