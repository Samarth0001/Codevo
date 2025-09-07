import express from 'express';
import { explainChat, latestExplainSession, newExplainSession, listExplainSessions, getExplainSessionById } from '../controllers/ExplanationController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/chat', auth, explainChat);
router.get('/latest', auth, latestExplainSession);
router.post('/new', auth, newExplainSession);
router.get('/sessions', auth, listExplainSessions);
router.get('/getSession', auth, getExplainSessionById);

export default router;
