// const express = require('express');
import express from 'express';
import { createInvitation, acceptInvitation, getInvitationDetails, listInvitesAndCollaborators, revokeInvitation, removeCollaborator } from '../controllers/InvitationController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Create invitation (requires auth)
router.post('/create', auth, createInvitation);

// Accept invitation (requires auth)
router.post('/accept/:token', auth, acceptInvitation);

// Get invitation details (no auth required - for checking if user needs to login)
router.get('/details/:token', getInvitationDetails);

// Owner management
router.get('/manage/:projectId', auth, listInvitesAndCollaborators);
router.post('/revoke', auth, revokeInvitation);
router.post('/removeCollaborator', auth, removeCollaborator);

export default router; 