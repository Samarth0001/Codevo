import express from 'express';
import {
    generatePasswordChangeToken,
    validatePasswordChangeToken,
    changePasswordWithToken,
    generateForgotPasswordToken,
    resetPasswordWithToken
} from '../controllers/PasswordResetController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Generate password change token (for authenticated users)
router.post('/generate-change-token',auth, generatePasswordChangeToken);

// Validate password change token
router.get('/validate-change-token/:token', validatePasswordChangeToken);

// Change password using token
router.post('/change-password',auth, changePasswordWithToken);

// Generate forgot password token (for unauthenticated users)
router.post('/generate-forgot-token', generateForgotPasswordToken);

// Reset password using forgot password token
router.post('/reset-password', resetPasswordWithToken);

export default router;
