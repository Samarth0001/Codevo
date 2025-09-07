import { Request, Response } from 'express';
import User from '../models/User';
import ResetPassword from '../models/ResetPassword';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mailSender from '../utils/mailSender';

// Generate and send password change token
export const generatePasswordChangeToken = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required"
            });
            return;
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Set expiration time (10 minutes from now)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Invalidate any existing tokens for this user and type
        await ResetPassword.updateMany(
            { userEmail: email.toLowerCase(), type: 'CHANGE_PASSWORD', used: false },
            { used: true }
        );

        // Create new reset password record
        const resetPasswordRecord = new ResetPassword({
            userEmail: email.toLowerCase(),
            tokenHash,
            type: 'CHANGE_PASSWORD',
            expiresAt,
            used: false
        });

        await resetPasswordRecord.save();

        // Send email with the token
        const resetUrl = `${process.env.FRONTEND_URL}/change-password/${token}`;
        
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Change Request</h2>
                <p>You have requested to change your password. Click the link below to proceed:</p>
                <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                    Change Password
                </a>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 10 minutes for security reasons.
                </p>
                <p style="color: #666; font-size: 14px;">
                    If you didn't request this password change, please ignore this email.
                </p>
            </div>
        `;

        await mailSender(
            email,
            "Password Change Request - Codevo",
            emailBody
        );

        res.status(200).json({
            success: true,
            message: "Password change link sent to your email"
        });

    } catch (error) {
        console.error('Error generating password change token:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Validate password change token
export const validatePasswordChangeToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        if (!token) {
            res.status(400).json({
                success: false,
                message: "Token is required"
            });
            return;
        }

        // Hash the token to compare with stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find the reset password record
        const resetRecord = await ResetPassword.findOne({
            tokenHash,
            type: 'CHANGE_PASSWORD',
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Token is valid"
        });

    } catch (error) {
        console.error('Error validating password change token:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Change password using token
export const changePasswordWithToken = async (req: Request, res: Response) => {
    try {
        const { token, oldPassword, newPassword } = req.body;

        if (!token || !oldPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: "Token, old password, and new password are required"
            });
            return;
        }

        // Hash the token to compare with stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find the reset password record
        const resetRecord = await ResetPassword.findOne({
            tokenHash,
            type: 'CHANGE_PASSWORD',
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
            return;
        }

        // Find the user
        const user = await User.findOne({ email: resetRecord.userEmail });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Verify the old password
        if (user.password) {
            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordValid) {
                res.status(400).json({
                    success: false,
                    message: "Current password is incorrect"
                });
                return;
            }
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        // Mark the token as used
        resetRecord.used = true;
        await resetRecord.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Reset password using forgot password token (no old password required)
export const resetPasswordWithToken = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            res.status(400).json({
                success: false,
                message: "Token and new password are required"
            });
            return;
        }

        // Hash the token to compare with stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find the reset password record
        const resetRecord = await ResetPassword.findOne({
            tokenHash,
            type: 'FORGOT_PASSWORD',
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
            return;
        }

        // Find the user
        const user = await User.findOne({ email: resetRecord.userEmail });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        // Mark the token as used
        resetRecord.used = true;
        await resetRecord.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Forgot password functionality
export const generateForgotPasswordToken = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required"
            });
            return;
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Set expiration time (15 minutes from now for forgot password)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Invalidate any existing tokens for this user and type
        await ResetPassword.updateMany(
            { userEmail: email.toLowerCase(), type: 'FORGOT_PASSWORD', used: false },
            { used: true }
        );

        // Create new reset password record
        const resetPasswordRecord = new ResetPassword({
            userEmail: email.toLowerCase(),
            tokenHash,
            type: 'FORGOT_PASSWORD',
            expiresAt,
            used: false
        });

        await resetPasswordRecord.save();

        // Send email with the token
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
        
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>You have requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                    Reset Password
                </a>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 10 minutes for security reasons.
                </p>
                <p style="color: #666; font-size: 14px;">
                    If you didn't request this password reset, please ignore this email.
                </p>
            </div>
        `;

        await mailSender(
            email,
            "Password Reset Request - Codevo",
            emailBody
        );

        res.status(200).json({
            success: true,
            message: "Password reset link sent to your email"
        });

    } catch (error) {
        console.error('Error generating forgot password token:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};