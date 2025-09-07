import { RequestHandler } from 'express';
import User from '../models/User';
import Profile from '../models/Profile';

/**
 * Update user profile information
 */
export const updateProfile: RequestHandler = async (req, res) => {
    try {
        const userId = (req as any).user?.id as string;
        const { name, email, gender, dateOfBirth, about, bio, contactNumber } = req.body;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        // Find the user and populate the profile
        const user = await User.findById(userId).populate('additionalDetails');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Update user basic info
        if (name) user.name = name;
        if (email) user.email = email;

        // Update profile details
        if (user.additionalDetails) {
            const profile = await Profile.findById(user.additionalDetails._id);
            if (profile) {
                if (gender !== undefined) profile.gender = gender;
                if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth;
                if (about !== undefined) profile.about = about;
                if (bio !== undefined) profile.bio = bio;
                if (contactNumber !== undefined) profile.contactNumber = contactNumber;
                
                await profile.save();
            }
        } else {
            // Create new profile if it doesn't exist
            const newProfile = new Profile({
                gender,
                dateOfBirth,
                about,
                bio,
                contactNumber
            });
            await newProfile.save();
            user.additionalDetails = newProfile._id;
        }

        await user.save();

        // Fetch updated user with populated profile
        const updatedUser = await User.findById(userId)
            .populate('additionalDetails')
            .select('-password -token -resetPasswordExpires');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error: any) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

/**
 * Get user profile information
 */
export const getProfile: RequestHandler = async (req, res) => {
    try {
        const userId = (req as any).user?.id as string;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        const user = await User.findById(userId)
            .populate('additionalDetails')
            .select('-password -token -resetPasswordExpires');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error: any) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};
