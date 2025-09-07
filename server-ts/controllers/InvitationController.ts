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
    const { projectId, projectName, invitedEmail, invitedRole } = req.body;
    const invitedBy = req.user?.id; // From auth middleware

    if (!invitedBy) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!projectId || !projectName || !invitedEmail) {
      res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
      return;
    }
    // Validate role
    const role = invitedRole === 'editor' ? 'editor' : 'reader';

    // Load project
    const project = await Project.findOne({ projectId });
    if (!project) {
      res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
      return;
    }

    // Only owners can invite
    const inviterIsOwner = String(project.projectCreater) === String(invitedBy) ||
      project.collaborators?.some((c: any) => (c.user?.toString?.() || String(c.user)) === String(invitedBy) && c.role === 'owner');
    if (!inviterIsOwner) {
      res.status(403).json({
        success: false,
        message: 'Only project owners can invite collaborators'
      });
      return;
    }

    // Check if already invited
    const existingInvitation = await Invitation.findOne({
      projectId,
      invitedEmail,
      status: 'pending'
    });

    if (existingInvitation) {
      res.status(400).json({ 
        success: false, 
        message: 'User already invited to this project' 
      });
      return;
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
      invitedRole: role,
      expiresAt
    });

    // Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL || 'https://codevo.live'}/invite/${token}`;
    await sendInvitationEmail(invitedEmail, projectName, inviteLink, role);

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
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Find invitation
    const invitation = await Invitation.findOne({ 
      token, 
      status: 'pending' 
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Invitation not found or expired'
      });
      return;
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
      return;
    }

    // Find project
    const project = await Project.findOne({ projectId: invitation.projectId });
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    // Check if user is already a collaborator
    if (project.collaborators.some((c: any) => c.user?.toString() === userId || c.toString?.() === userId)) {
      // Ensure project is present in user's project list with role from invitation
      const effectiveRole = invitation.invitedRole === 'editor' ? 'editor' : 'reader';
      await User.findByIdAndUpdate(userId, { $addToSet: { projects: { project: project._id, role: effectiveRole } } });

      await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });
      res.status(200).json({
        success: true,
        message: 'Already a collaborator',
        projectId: invitation.projectId
      });
      return;
    }

    // Add user as collaborator with role from invitation
    const effectiveRole = invitation.invitedRole === 'editor' ? 'editor' : 'reader';
    await Project.findByIdAndUpdate(project._id, {
      $addToSet: { collaborators: { user: userId, role: effectiveRole, addedAt: new Date() } }
    });

    // Also add this project to the invited user's project list with role from invitation
    await User.findByIdAndUpdate(userId, {
      $addToSet: { projects: { project: project._id, role: effectiveRole, joinedAt: new Date() } }
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
      res.status(404).json({
        success: false,
        message: 'Invitation not found or expired'
      });
      return;
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
      return;
    }

    res.status(200).json({
      success: true,
      invitation: {
        projectName: invitation.projectName,
        projectId: invitation.projectId,
        invitedEmail: invitation.invitedEmail,
        invitedRole: invitation.invitedRole
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

// List collaborators and pending invitations for a project (collaborators can view, only owners can manage)
export const listInvitesAndCollaborators = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as any;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const project = await Project.findOne({ projectId })
      .populate({ path: 'collaborators.user', select: 'name email _id' });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Check if user is a collaborator (any role)
    const isCollaborator = project.collaborators?.some((c: any) => 
      String(c.user?._id || c.user) === String(userId)
    );
    if (!isCollaborator) {
      res.status(403).json({ success: false, message: 'You must be a collaborator to view this project' });
      return;
    }

    // Check if user is owner (for pending invitations)
    const isOwner = String(project.projectCreater) === String(userId) ||
      project.collaborators?.some((c: any) => (String(c.user?._id || c.user) === String(userId) && c.role === 'owner'));

    // Only owners can see pending invitations
    let pendingInvitations: any[] = [];
    if (isOwner) {
      pendingInvitations = await Invitation.find({ projectId, status: 'pending' })
        .select('_id invitedEmail invitedRole createdAt');
    }

    const collaborators = (project.collaborators || []).map((c: any) => ({
      userId: String(c.user?._id || c.user),
      name: c.user?.name,
      email: c.user?.email,
      role: c.role,
    }));

    res.status(200).json({ 
      success: true, 
      collaborators, 
      pendingInvitations,
      isOwner // Include this so frontend knows if user can manage
    });
  } catch (error: any) {
    console.error('Error listing invitations/collaborators:', error);
    res.status(500).json({ success: false, message: 'Failed to list invitations/collaborators', error: error.message });
  }
};

// Revoke a pending invitation (owner only)
export const revokeInvitation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, invitationId } = req.body as any;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }
    const isOwner = String(project.projectCreater) === String(userId) ||
      project.collaborators?.some((c: any) => (String(c.user?._id || c.user) === String(userId) && c.role === 'owner'));
    if (!isOwner) {
      res.status(403).json({ success: false, message: 'Only project owners can revoke invitations' });
      return;
    }

    const deleted = await Invitation.deleteOne({ _id: invitationId, projectId, status: 'pending' });
    if (deleted.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Pending invitation not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Invitation revoked' });
  } catch (error: any) {
    console.error('Error revoking invitation:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke invitation', error: error.message });
  }
};

// Remove a collaborator who has already joined (owner only)
export const removeCollaborator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, userId: targetUserId } = req.body as any;
    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }
    const isOwner = String(project.projectCreater) === String(requesterId) ||
      project.collaborators?.some((c: any) => (String(c.user?._id || c.user) === String(requesterId) && c.role === 'owner'));
    if (!isOwner) {
      res.status(403).json({ success: false, message: 'Only project owners can remove collaborators' });
      return;
    }
    // Prevent removing owner
    if (String(project.projectCreater) === String(targetUserId)) {
      res.status(400).json({ success: false, message: 'Cannot remove project owner' });
      return;
    }

    await Project.findByIdAndUpdate(project._id, { $pull: { collaborators: { user: targetUserId } } });
    await User.findByIdAndUpdate(targetUserId, { $pull: { projects: { project: project._id } } });

    res.status(200).json({ success: true, message: 'Collaborator removed' });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ success: false, message: 'Failed to remove collaborator', error: error.message });
  }
};