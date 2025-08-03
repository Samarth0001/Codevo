const express = require('express');
import { createInvitation, acceptInvitation, getInvitationDetails } from '../controllers/InvitationController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Create invitation (requires auth)
router.post('/create', auth, createInvitation);

// Accept invitation (requires auth)
router.post('/accept/:token', auth, acceptInvitation);

// Get invitation details (no auth required - for checking if user needs to login)
router.get('/details/:token', getInvitationDetails);

export default router; 