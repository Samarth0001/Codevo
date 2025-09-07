import { apiConnector } from '../apiConnector';
import { PasswordResetEndPoints } from '../apis';

export const PasswordResetAPI = {
    // Generate password change token
    generatePasswordChangeToken: async (email: string) => {
        try {
            const response = await apiConnector('POST', PasswordResetEndPoints.GENERATE_CHANGE_TOKEN_API, { email });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Validate password change token
    validatePasswordChangeToken: async (token: string) => {
        try {
            const response = await apiConnector('GET', `${PasswordResetEndPoints.VALIDATE_CHANGE_TOKEN_API}/${token}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Change password using token
    changePasswordWithToken: async (token: string, oldPassword: string, newPassword: string) => {
        try {
            const response = await apiConnector('POST', PasswordResetEndPoints.CHANGE_PASSWORD_API, { 
                token, 
                oldPassword,
                newPassword 
            });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Reset password using forgot password token (no old password required)
    resetPasswordWithToken: async (token: string, newPassword: string) => {
        try {
            const response = await apiConnector('POST', PasswordResetEndPoints.RESET_PASSWORD_API, { 
                token, 
                newPassword 
            });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    },

    // Generate forgot password token
    generateForgotPasswordToken: async (email: string) => {
        try {
            const response = await apiConnector('POST', PasswordResetEndPoints.GENERATE_FORGOT_TOKEN_API, { email });
            return response.data;
        } catch (error: any) {
            throw error;
        }
    }
};
