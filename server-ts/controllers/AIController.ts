import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import ChatSession from '../models/ChatSession';
import User from '../models/User';
import { userActivity } from '../services/activityTracker';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function chat(req: Request, res: Response) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey){
        res.status(500).json({ success: false, message: 'Missing GEMINI_API_KEY' });
        return;
    }
    const { messages, sessionId, fileContext, projectId } = req.body as { 
      sessionId?: string, 
      messages: Array<{ role: 'user' | 'model' | 'system'; content: string }>,
      fileContext?: { path: string; content: string },
      projectId?: string
    };
    if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ success: false, message: 'messages array required' });
        return;
    }

    const userId = (req as any).user?.id || (req as any).user?._id; // from auth middleware
    if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    // Track user activity for chat operations
    if (projectId) {
        userActivity(projectId);
    }

    // Check daily user quota first (for code generation)
    const user = await User.findById(userId);
    if (!user || !user.aiQuota || !user.aiQuota.generation) {
      res.status(404).json({ success: false, message: 'User not found or quota not initialized' });
      return;
    }

    // Reset daily quota if it's a new day
    const today = new Date().toDateString();
    const lastResetDate = user.aiQuota.generation.lastResetDate.toDateString();
    if (today !== lastResetDate) {
      user.aiQuota.generation.dailyCalls = 0;
      user.aiQuota.generation.lastResetDate = new Date();
      await user.save();
    }

    // Check if user has exceeded daily quota for generation
    if (user.aiQuota.generation.dailyCalls >= user.aiQuota.generation.maxDailyCalls) {
      res.status(200).json({ 
        success: true, 
        limitReached: true, 
        dailyCalls: user.aiQuota.generation.dailyCalls, 
        maxDailyCalls: user.aiQuota.generation.maxDailyCalls,
        message: 'Daily code generation quota exceeded. Try again tomorrow.'
      });
      return;
    }

    let session = sessionId ? await ChatSession.findById(sessionId) : await ChatSession.findOne({ user: userId }).sort({ updatedAt: -1 });
    if (session && String(session.user) !== String(userId)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (!session) {
      // First usage: create a session
      session = await ChatSession.create({ user: userId, messages: [], callCount: 0 });
    }

    const client = new GoogleGenAI({ apiKey });

    // Enhanced system prompt for code generation
    const systemPrompt = `You are a helpful coding assistant for an online IDE. When the user asks for code generation or modification:

1. If they provide file context, analyze the current file content and generate the complete updated file content
2. Always return the complete file content, not just the changes
3. Include clear concise explanations of what you changed and why
4. Format your response as:
   - Concise Explanation of changes
   - Complete updated file content in a code block with the appropriate language
5. Make sure the code is production-ready and follows best practices

When generating code, be thorough and include all necessary imports, error handling, and documentation.`;

    // Prepare messages with enhanced context
    const enhancedMessages = [
      { role: 'user' as const, content: systemPrompt },
      ...messages
    ];

    // Add file context if provided
    if (fileContext) {
      enhancedMessages.push({
        role: 'user' as const,
        content: `Current file context:\nFile: ${fileContext.path}\n\n\`\`\`\n${fileContext.content}\n\`\`\``
      });
    }

    // Convert to parts content
    const contents = enhancedMessages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }]
    }));

    const result = await client.models.generateContent({ model: MODEL, contents });
    let text = (result as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';
    // Ensure bold markdown renders correctly on client; leave as-is (client renders markdown)

    // Extract updated file content if present
    const codeBlockMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);
    const updatedFileContent = codeBlockMatch ? codeBlockMatch[2].trim() : null;

    // If this is the very first turn in this session, generate a topic-related title from the first user message
    if ((session.messages?.length || 0) === 0 && Array.isArray(messages) && messages.length > 0) {
      try {
        const firstUserInRequest = messages.find(m => m.role === 'user');
        const base = (firstUserInRequest?.content || '').slice(0, 2000);
        const titlePrompt = [{
          role: 'user' as const,
          content: `Generate ONLY a concise title for a coding chat session. Return ONLY 2-5 words in Title Case, nothing else. No explanations, no options, no additional text. Just the title based on user message.
                User message: "${base}"`
        }];
        const titleRes = await client.models.generateContent({ model: MODEL, contents: titlePrompt.map(m => ({ role: m.role, parts: [{ text: m.content }] })) });
        const titleText = (titleRes as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';
        // Clean up the title - take only the first line and remove quotes
        const cleanTitle = titleText.trim().split('\n')[0].replace(/['"]/g, '').trim();
        if (cleanTitle) {
          (session as any).title = cleanTitle.slice(0, 60);
        }
      } catch {}
    }

    // persist messages and increment call counts
    // store latest user message for this turn as well
    const lastUser = messages[messages.length - 1];
    if (lastUser && lastUser.role === 'user') {
      session.messages.push(lastUser as any);
    }
    session.messages.push({ role: 'model', content: text } as any);
    session.callCount += 1;
    await session.save();

    // Increment user's daily quota for generation
    user.aiQuota.generation.dailyCalls += 1;
    await user.save();

    res.json({ 
      success: true, 
      text, 
      sessionId: session.id, 
      callCount: session.callCount, 
      dailyCalls: user.aiQuota.generation.dailyCalls,
      maxDailyCalls: user.aiQuota.generation.maxDailyCalls,
      messages: session.messages,
      updatedFileContent,
      originalFileContent: fileContext?.content
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function latestSession(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Track user activity for AI operations
    const { projectId } = req.query as { projectId?: string };
    if (projectId) {
        userActivity(projectId);
    }

    // Get user quota info (for generation)
    const user = await User.findById(userId);
    if (!user || !user.aiQuota || !user.aiQuota.generation) {
      res.status(404).json({ success: false, message: 'User not found or quota not initialized' });
      return;
    }

    // Reset daily quota if it's a new day
    const today = new Date().toDateString();
    const lastResetDate = user.aiQuota.generation.lastResetDate.toDateString();
    if (today !== lastResetDate) {
      user.aiQuota.generation.dailyCalls = 0;
      user.aiQuota.generation.lastResetDate = new Date();
      await user.save();
    }

    const session = await ChatSession.findOne({ user: userId }).sort({ updatedAt: -1 });
    if (!session) {
      const created = await ChatSession.create({ user: userId, messages: [], callCount: 0 });
      res.json({ 
        success: true, 
        sessionId: created.id, 
        messages: [], 
        callCount: 0, 
        dailyCalls: user.aiQuota.generation.dailyCalls,
        maxDailyCalls: user.aiQuota.generation.maxDailyCalls
      });
      return;
    }
    res.json({ 
      success: true, 
      sessionId: session.id, 
      messages: session.messages, 
      callCount: session.callCount, 
      dailyCalls: user.aiQuota.generation.dailyCalls,
      maxDailyCalls: user.aiQuota.generation.maxDailyCalls
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function newSession(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Track user activity for AI operations
    const { projectId } = req.body as { projectId?: string };
    if (projectId) {
        userActivity(projectId);
    }

    // Get user quota info (for generation)
    const user = await User.findById(userId);
    if (!user || !user.aiQuota || !user.aiQuota.generation) {
      res.status(404).json({ success: false, message: 'User not found or quota not initialized' });
      return;
    }

    // Reset daily quota if it's a new day
    const today = new Date().toDateString();
    const lastResetDate = user.aiQuota.generation.lastResetDate.toDateString();
    if (today !== lastResetDate) {
      user.aiQuota.generation.dailyCalls = 0;
      user.aiQuota.generation.lastResetDate = new Date();
      await user.save();
    }

    // Check session limit (max 10 sessions per user for generation)
    const MAX_SESSIONS = 10;
    const existingSessions = await ChatSession.find({ user: userId }).sort({ createdAt: 1 });
    
    // Delete oldest sessions if limit exceeded
    if (existingSessions.length >= MAX_SESSIONS) {
      const sessionsToDelete = existingSessions.slice(0, existingSessions.length - MAX_SESSIONS + 1);
      const sessionIdsToDelete = sessionsToDelete.map(s => s._id);
      await ChatSession.deleteMany({ _id: { $in: sessionIdsToDelete } });
    }

    const created = await ChatSession.create({ user: userId, messages: [], callCount: 0 });
    res.json({ 
      success: true, 
      sessionId: created.id, 
      messages: [], 
      callCount: 0, 
      dailyCalls: user.aiQuota.generation.dailyCalls,
      maxDailyCalls: user.aiQuota.generation.maxDailyCalls
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}


export async function listSessions(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Track user activity for AI operations
    const { projectId } = req.query as { projectId?: string };
    if (projectId) {
        userActivity(projectId);
    }

    const sessions = await ChatSession.find({ user: userId })
      .sort({ updatedAt: -1 })
      .select(['_id', 'title', 'updatedAt', 'createdAt'])
      .lean();

    res.json({ success: true, sessions: sessions.map(s => ({
      id: String(s._id),
      title: s.title || 'New Chat',
      updatedAt: s.updatedAt,
      createdAt: s.createdAt
    })) });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function getSessionById(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Track user activity for AI operations
    const { projectId } = req.query as { projectId?: string };
    if (projectId) {
        userActivity(projectId);
    }

    const { id } = req.query as { id: string };
    const session = await ChatSession.findById(id);
    if (!session || String(session.user) !== String(userId)) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }
    res.json({
      success: true,
      sessionId: session.id,
      messages: session.messages,
      callCount: session.callCount
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}


