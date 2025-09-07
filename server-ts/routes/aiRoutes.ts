import express from 'express';
import { chat, latestSession, newSession, listSessions, getSessionById } from '../controllers/AIController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/chat', auth, chat);
router.get('/latest', auth, latestSession);
router.post('/new', auth, newSession);
router.get('/sessions', auth, listSessions);
router.get('/getSession', auth, getSessionById);

export default router;


