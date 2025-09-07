import { AIEndPoints } from "../apis";
import { apiConnector } from "../apiConnector";

const {
  GET_LATEST_CHAT_SESSION_API,
  CREATE_NEW_CHAT_SESSION_API,
  CHAT_API,
  LIST_CHAT_SESSIONS_API,
  GET_CHAT_SESSION_BY_ID_API
} = AIEndPoints;

export type ChatMessage = {
  role: 'user' | 'model' | 'system';
  content: string;
};

export type FileContext = {
  path: string;
  content: string;
};

export type ChatResponse = {
  text: string;
  sessionId?: string;
  callCount?: number;
  dailyCalls?: number;
  maxDailyCalls?: number;
  messages?: any[];
  updatedFileContent?: string;
  originalFileContent?: string;
  limitReached?: boolean;
  message?: string;
};

export async function chatWithGemini(
  messages: ChatMessage[], 
  sessionId?: string, 
  fileContext?: FileContext,
  projectId?: string
): Promise<ChatResponse> {
  const response = await apiConnector('POST', CHAT_API, { 
    messages, 
    sessionId, 
    fileContext, 
    projectId 
  });
  return response.data;
}

export async function getLatestChatSession(projectId?: string): Promise<{ sessionId: string; messages: ChatMessage[]; callCount: number; dailyCalls: number; maxDailyCalls: number }> {
  const response = await apiConnector('GET', GET_LATEST_CHAT_SESSION_API, null, undefined, { projectId });
  const data = response.data;
  return { 
    sessionId: data.sessionId, 
    messages: data.messages || [], 
    callCount: data.callCount || 0, 
    dailyCalls: data.dailyCalls || 0,
    maxDailyCalls: data.maxDailyCalls || 40
  };
}

export async function createNewChatSession(projectId?: string): Promise<{ sessionId: string; messages: ChatMessage[]; callCount: number; dailyCalls: number; maxDailyCalls: number }> {
  const response = await apiConnector('POST', CREATE_NEW_CHAT_SESSION_API, { projectId });
  const data = response.data;
  return { 
    sessionId: data.sessionId, 
    messages: data.messages || [], 
    callCount: data.callCount || 0, 
    dailyCalls: data.dailyCalls || 0,
    maxDailyCalls: data.maxDailyCalls || 40
  };
}

export type ChatSessionListItem = { id: string; title: string; updatedAt: string; createdAt: string };

export async function listChatSessions(projectId?: string): Promise<ChatSessionListItem[]> {
  const response = await apiConnector('GET', LIST_CHAT_SESSIONS_API, null, undefined, { projectId });
  const data = response.data;
  return (data.sessions || []) as ChatSessionListItem[];
}

export async function getChatSessionById(id: string, projectId?: string): Promise<{ sessionId: string; messages: ChatMessage[]; callCount: number }> {
  const response = await apiConnector('GET', GET_CHAT_SESSION_BY_ID_API, null, undefined, { id, projectId });
  const data = response.data;
  return { sessionId: data.sessionId, messages: data.messages || [], callCount: data.callCount || 0 };
}

export function extractFirstCodeBlock(markdown: string): { code: string; lang?: string } | null {
  const match = markdown.match(/```(\w+)?\n([\s\S]*?)```/);
  if (!match) return null;
  const [, lang, code] = match;
  return { code: code.trim(), lang };
}


