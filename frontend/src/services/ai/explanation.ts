import { ExplanationEndPoints } from "../apis";
import { apiConnector } from "../apiConnector";

const {
  GET_LATEST_EXPLAIN_SESSION_API,
  CREATE_NEW_EXPLAIN_SESSION_API,
  EXPLAIN_CHAT_API,
  LIST_EXPLAIN_SESSIONS_API,
  GET_EXPLAIN_SESSION_BY_ID_API
} = ExplanationEndPoints;

export type ChatMessage = {
  role: 'user' | 'model' | 'system';
  content: string;
};

export type FileContext = {
  path: string;
  content: string;
};

export type ExplainChatResponse = {
  text: string;
  sessionId?: string;
  callCount?: number;
  dailyCalls?: number;
  maxDailyCalls?: number;
  messages?: any[];
  limitReached?: boolean;
  message?: string;
};

export type ExplainChatSessionListItem = { id: string; title: string; updatedAt: string; createdAt: string };

export async function chatWithGeminiExplain(
  messages: ChatMessage[], 
  sessionId?: string, 
  fileContext?: FileContext,
  projectId?: string
): Promise<ExplainChatResponse> {
  const response = await apiConnector('POST', EXPLAIN_CHAT_API, { 
    messages, 
    sessionId, 
    fileContext, 
    projectId 
  });
  return response.data;
}

export async function getLatestExplainSession(projectId?: string): Promise<{ sessionId: string; messages: ChatMessage[]; callCount: number; dailyCalls: number; maxDailyCalls: number }> {
  const response = await apiConnector('GET', GET_LATEST_EXPLAIN_SESSION_API, null, undefined, { projectId });
  const data = response.data;
  return { sessionId: data.sessionId, messages: data.messages || [], callCount: data.callCount || 0, dailyCalls: data.dailyCalls || 0, maxDailyCalls: data.maxDailyCalls || 30 };
}

export async function createNewExplainSession(projectId?: string): Promise<{ sessionId: string; messages: ChatMessage[]; callCount: number; dailyCalls: number; maxDailyCalls: number }> {
  const response = await apiConnector('POST', CREATE_NEW_EXPLAIN_SESSION_API, { projectId });
  const data = response.data;
  return { sessionId: data.sessionId, messages: data.messages || [], callCount: data.callCount || 0, dailyCalls: data.dailyCalls || 0, maxDailyCalls: data.maxDailyCalls || 30 };
}

export async function listExplainSessions(projectId?: string): Promise<ExplainChatSessionListItem[]> {
  const response = await apiConnector('GET', LIST_EXPLAIN_SESSIONS_API, null, undefined, { projectId });
  const data = response.data;
  return (data.sessions || []) as ExplainChatSessionListItem[];
}

export async function getExplainSessionById(id: string, projectId?: string): Promise<{ sessionId: string; messages: ChatMessage[]; callCount: number }> {
  const response = await apiConnector('GET', GET_EXPLAIN_SESSION_BY_ID_API, null, undefined, { id, projectId });
  const data = response.data;
  return { sessionId: data.sessionId, messages: data.messages || [], callCount: data.callCount || 0 };
}
