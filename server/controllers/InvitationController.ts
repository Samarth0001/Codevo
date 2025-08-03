import { Request, Response } from 'express';
import crypto from 'crypto';
import Invitation from '../models/Invitation';
import Project from '../models/Project';
import User from '../models/User';
import { sendInvitationEmail } from '../utils/mailSender';

// Extend Request type to include user property from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    [key: string]: any;
  };
}

// Create invitation
export const createInvitation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, projectName, invitedEmail } = req.body;
    const invitedBy = req.user?.id; // From auth middleware

    if (!invitedBy) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    if (!projectId || !projectName || !invitedEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if user is already a collaborator
    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Check if already invited
    const existingInvitation = await Invitation.findOne({
      projectId,
      invitedEmail,
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already invited to this project' 
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create invitation
    const invitation = await Invitation.create({
      token,
      projectId,
      projectName,
      invitedBy,
      invitedEmail,
      expiresAt
    });

    // Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;
    await sendInvitationEmail(invitedEmail, projectName, inviteLink);

    console.log('Invitation created:', invitation);
    
    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation
    });

  } catch (error: any) {
    console.error('Error creating invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invitation',
      error: error.message
    });
  }
};

// Accept invitation
export const acceptInvitation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find invitation
    const invitation = await Invitation.findOne({ 
      token, 
      status: 'pending' 
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or expired'
      });
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }

    // Find project
    const project = await Project.findOne({ projectId: invitation.projectId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is already a collaborator
    if (project.collaborators.some(collaborator => collaborator.toString() === userId)) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });
      return res.status(200).json({
        success: true,
        message: 'Already a collaborator',
        projectId: invitation.projectId
      });
    }

    // Add user as collaborator
    await Project.findByIdAndUpdate(project._id, {
      $addToSet: { collaborators: userId }
    });

    // Mark invitation as accepted
    await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });

    console.log('Invitation accepted:', invitation);

    res.status(200).json({
      success: true,
      message: 'Successfully joined project',
      projectId: invitation.projectId
    });

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept invitation',
      error: error.message
    });
  }
};

// Get invitation details (for checking if user needs to login)
export const getInvitationDetails = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ 
      token, 
      status: 'pending' 
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or expired'
      });
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }

    res.status(200).json({
      success: true,
      invitation: {
        projectName: invitation.projectName,
        projectId: invitation.projectId,
        invitedEmail: invitation.invitedEmail
      }
    });

  } catch (error: any) {
    console.error('Error getting invitation details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invitation details',
      error: error.message
    });
  }
}; 