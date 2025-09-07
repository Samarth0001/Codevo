import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import ExplainChatSession from '../models/ExplainChatSession';
import User from '../models/User';
import { userActivity } from '../services/activityTracker';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function explainChat(req: Request, res: Response) {
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

    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    // Track user activity for chat operations
    if (projectId) {
        userActivity(projectId);
    }

    // Check daily user quota first (for code explanation)
    const user = await User.findById(userId);
    if (!user || !user.aiQuota || !user.aiQuota.explanation) {
      res.status(404).json({ success: false, message: 'User not found or quota not initialized' });
      return;
    }

    // Reset daily quota if it's a new day
    const today = new Date().toDateString();
    const lastResetDate = user.aiQuota.explanation.lastResetDate.toDateString();
    if (today !== lastResetDate) {
      user.aiQuota.explanation.dailyCalls = 0;
      user.aiQuota.explanation.lastResetDate = new Date();
      await user.save();
    }

    // Check if user has exceeded daily quota for explanation
    if (user.aiQuota.explanation.dailyCalls >= user.aiQuota.explanation.maxDailyCalls) {
      res.status(200).json({ 
        success: true, 
        limitReached: true, 
        dailyCalls: user.aiQuota.explanation.dailyCalls, 
        maxDailyCalls: user.aiQuota.explanation.maxDailyCalls,
        message: 'Daily code explanation quota exceeded. Try again tomorrow.'
      });
      return;
    }

    let session = sessionId ? await ExplainChatSession.findById(sessionId) : await ExplainChatSession.findOne({ user: userId }).sort({ updatedAt: -1 });
    if (session && String(session.user) !== String(userId)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (!session) {
      session = await ExplainChatSession.create({ user: userId, messages: [], callCount: 0 });
    }

    // Enhanced system prompt for code explanation and coding questions
    const systemPrompt = `You are a specialized coding and technology assistant. Your role is to help with:

1. **Code Explanation**: Explain how code works, break down complex logic, and clarify programming concepts, highlight important concepts, patterns, and best practices, be thorough but concise in your explanations, focus on making the code understandable for developers of all levels
2. **Technology Questions**: Answer questions about programming languages, frameworks, tools, and best practices
3. **Learning Support**: Help with coding concepts, debugging, and understanding technical topics

**CODE FORMATTING RULES**:
- When providing code examples, ALWAYS wrap them in proper markdown code blocks with language specification
- Use \`\`\`language for code blocks (e.g., \`\`\`javascript, \`\`\`python, \`\`\`html)
- Place code blocks in logical order within your explanation
- Ensure code examples are properly formatted and indented
- Use inline code \`backticks\` for short code snippets, variables, or function names

**IMPORTANT**: You should ONLY respond to questions related to:
- Programming and coding
- Software development
- Technology and computer science
- Code debugging and optimization
- Programming languages, frameworks, and tools
- Software engineering concepts
- Technical learning and education

**DO NOT** answer questions about:
- General knowledge unrelated to programming
- Personal advice
- Non-technical topics
- Entertainment, sports, or other non-coding subjects

If a user asks a non-coding question, politely decline and redirect them to ask coding or technology-related questions instead. Always maintain focus on your role as a coding assistant.`;

    // Prepare messages with enhanced context
    const enhancedMessages = [
      { role: 'user' as const, content: systemPrompt },
      ...messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    ];

    // Add file context if provided
    if (fileContext) {
      enhancedMessages.push({
        role: 'user' as const,
        content: `Code to explain:\nFile: ${fileContext.path}\n\n\`\`\`\n${fileContext.content}\n\`\`\``
      });
    }

    // Convert to parts content
    const contents = enhancedMessages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }]
    }));

    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({ model: MODEL, contents });
    let text = (result as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';

    // If this is the very first turn in this session, generate a topic-related title from the first user message
    if ((session.messages?.length || 0) === 0 && Array.isArray(messages) && messages.length > 0) {
      try {
        const firstUserInRequest = messages.find(m => m.role === 'user');
        if (firstUserInRequest) {
          const titlePrompt = `Generate ONLY a concise title for a coding chat session. Return ONLY 2-5 words in Title Case, nothing else. No explanations, no options, no additional text. Just the title based on user message.
                   User message: "${firstUserInRequest.content}" `;
          const titleResult = await client.models.generateContent({ 
            model: MODEL, 
            contents: [{ role: 'user', parts: [{ text: titlePrompt }] }] 
          });
          const titleText = (titleResult as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';
          // Clean up the title - take only the first line and remove quotes
          const cleanTitle = titleText.trim().split('\n')[0].replace(/['"]/g, '').trim();
          session.title = cleanTitle;
        }
      } catch (e) {
        console.error('Error generating title:', e);
      }
    }

    // store latest user message for this turn as well
    const lastUser = messages[messages.length - 1];
    if (lastUser && lastUser.role === 'user') {
      session.messages.push(lastUser as any);
    }
    session.messages.push({ role: 'model', content: text } as any);
    session.callCount += 1;
    await session.save();

    // Increment user's daily quota for explanation
    user.aiQuota.explanation.dailyCalls += 1;
    await user.save();

    res.json({ 
      success: true, 
      text, 
      sessionId: session.id, 
      callCount: session.callCount, 
      dailyCalls: user.aiQuota.explanation.dailyCalls,
      maxDailyCalls: user.aiQuota.explanation.maxDailyCalls,
      messages: session.messages
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function latestExplainSession(req: Request, res: Response) {
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

    // Get user quota info (for explanation)
    const user = await User.findById(userId);
    if (!user || !user.aiQuota || !user.aiQuota.explanation) {
      res.status(404).json({ success: false, message: 'User not found or quota not initialized' });
      return;
    }

    // Reset daily quota if it's a new day
    const today = new Date().toDateString();
    const lastResetDate = user.aiQuota.explanation.lastResetDate.toDateString();
    if (today !== lastResetDate) {
      user.aiQuota.explanation.dailyCalls = 0;
      user.aiQuota.explanation.lastResetDate = new Date();
      await user.save();
    }

    const session = await ExplainChatSession.findOne({ user: userId }).sort({ updatedAt: -1 });
    if (!session) {
      const created = await ExplainChatSession.create({ user: userId, messages: [], callCount: 0 });
      res.json({ 
        success: true, 
        sessionId: created.id, 
        messages: [], 
        callCount: 0, 
        dailyCalls: user.aiQuota.explanation.dailyCalls,
        maxDailyCalls: user.aiQuota.explanation.maxDailyCalls
      });
      return;
    }
    res.json({ 
      success: true, 
      sessionId: session.id, 
      messages: session.messages, 
      callCount: session.callCount, 
      dailyCalls: user.aiQuota.explanation.dailyCalls,
      maxDailyCalls: user.aiQuota.explanation.maxDailyCalls
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function newExplainSession(req: Request, res: Response) {
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

    // Get user quota info (for explanation)
    const user = await User.findById(userId);
    if (!user || !user.aiQuota || !user.aiQuota.explanation) {
      res.status(404).json({ success: false, message: 'User not found or quota not initialized' });
      return;
    }

    // Reset daily quota if it's a new day
    const today = new Date().toDateString();
    const lastResetDate = user.aiQuota.explanation.lastResetDate.toDateString();
    if (today !== lastResetDate) {
      user.aiQuota.explanation.dailyCalls = 0;
      user.aiQuota.explanation.lastResetDate = new Date();
      await user.save();
    }

    // Check session limit (max 5 sessions per user for explanation)
    const MAX_SESSIONS = 5;
    const existingSessions = await ExplainChatSession.find({ user: userId }).sort({ createdAt: 1 });
    
    // Delete oldest sessions if limit exceeded
    if (existingSessions.length >= MAX_SESSIONS) {
      const sessionsToDelete = existingSessions.slice(0, existingSessions.length - MAX_SESSIONS + 1);
      const sessionIdsToDelete = sessionsToDelete.map(s => s._id);
      await ExplainChatSession.deleteMany({ _id: { $in: sessionIdsToDelete } });
    }

    const created = await ExplainChatSession.create({ user: userId, messages: [], callCount: 0 });
    res.json({ 
      success: true, 
      sessionId: created.id, 
      messages: [], 
      callCount: 0, 
      dailyCalls: user.aiQuota.explanation.dailyCalls,
      maxDailyCalls: user.aiQuota.explanation.maxDailyCalls
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function listExplainSessions(req: Request, res: Response) {
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
    const sessions = await ExplainChatSession.find({ user: userId }).sort({ updatedAt: -1 });
    res.json({ 
      success: true, 
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title || 'New Chat',
        updatedAt: s.updatedAt,
        createdAt: s.createdAt
      })) 
    });
    return;
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'AI error' });
    return;
  }
}

export async function getExplainSessionById(req: Request, res: Response) {
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
    const session = await ExplainChatSession.findById(id);
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
