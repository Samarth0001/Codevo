import { act, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DiffViewer } from "@/components/ui/DiffViewer";
import ReactMarkdown from 'react-markdown';
import { aiBus } from "@/utils/AIEventBus";
import { chatWithGemini, ChatMessage, FileContext, getLatestChatSession, createNewChatSession, listChatSessions, getChatSessionById, ChatSessionListItem, extractFirstCodeBlock } from "@/services/ai/gemini";
import { chatWithGeminiExplain, getLatestExplainSession, createNewExplainSession, listExplainSessions, getExplainSessionById, ExplainChatSessionListItem } from "@/services/ai/explanation";
import { useCollaboration } from "@/context/CollaborationContext";
import { useEditor } from "@/context/EditorContext";
import { FiPlus } from "react-icons/fi";
import { Bot } from "lucide-react";

type ChatBubble = {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  code?: { lang?: string; code: string } | null;
  diff?: {
    oldCode: string;
    newCode: string;
    fileName: string;
  } | null;
  parsedContent?: Array<{ type: 'text' | 'code'; content: string; language?: string }>;
};

interface AIPanelProps {
  projectId?: string;
}

export default function AIPanel({ projectId }: AIPanelProps) {
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [quota, setQuota] = useState<{ dailyCalls: number; maxDailyCalls: number }>({ dailyCalls: 0, maxDailyCalls: 25 });
  const [generateInput, setGenerateInput] = useState("");
  const [explainInput, setExplainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'explain'>("generate");
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedContextPath, setSelectedContextPath] = useState<string>("");
  const [isContextSelected, setIsContextSelected] = useState<boolean>(false);
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [explainSessions, setExplainSessions] = useState<ExplainChatSessionListItem[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const { permissions } = useCollaboration();
  const canUseAI = permissions?.canEditCode || false;
  const { activeFile } = useEditor();

  // localStorage keys for session persistence
  const GENERATE_SESSION_KEY = 'ai_generate_session_id';
  const EXPLAIN_SESSION_KEY = 'ai_explain_session_id';

  // localStorage utility functions
  const getStoredSessionId = (tab: 'generate' | 'explain'): string | null => {
    const key = tab === 'generate' ? GENERATE_SESSION_KEY : EXPLAIN_SESSION_KEY;
    return localStorage.getItem(key);
  };

  const setStoredSessionId = (tab: 'generate' | 'explain', sessionId: string) => {
    const key = tab === 'generate' ? GENERATE_SESSION_KEY : EXPLAIN_SESSION_KEY;
    localStorage.setItem(key, sessionId);
  };

  // Calculate height for code blocks based on content
  const calculateCodeBlockHeight = (content: string): number => {
    const lines = content.split('\n').length;
    const minHeight = 80; // Minimum height in pixels
    const maxHeight = 600; // Maximum height in pixels
    const lineHeight = 20; // Approximate line height in pixels
    const padding = 40; // Padding for the textarea
    
    const calculatedHeight = Math.max(minHeight, Math.min(maxHeight, lines * lineHeight + padding));
    return calculatedHeight;
  };

  // Parse content to split text and code blocks
  const parseContentWithCodeBlocks = (content: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> => {
    if (!content || content.trim() === '') {
      return [{ type: 'text', content: '' }];
    }

    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({ type: 'text', content: textContent });
        }
      }

      // Add code block
      const language = match[1] || '';
      const codeContent = match[2].trim();
      if (codeContent) {
        parts.push({ type: 'code', content: codeContent, language });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // If no code blocks found, return the entire content as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: content.trim() });
    }

    return parts;
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  // Load sessions based on active tab
  const loadSessions = async () => {
    try {
      if (activeTab === 'generate') {
        // Try to load stored session first, fallback to latest
        const storedSessionId = getStoredSessionId('generate');
        let sessionData;
        
        if (storedSessionId) {
          try {
            sessionData = await getChatSessionById(storedSessionId, projectId);
            // Get quota info from latest session since getChatSessionById doesn't include it
            const latest = await getLatestChatSession(projectId);
            sessionData.dailyCalls = latest.dailyCalls;
            sessionData.maxDailyCalls = latest.maxDailyCalls;
          } catch (e) {
            // If stored session doesn't exist, fallback to latest
            sessionData = await getLatestChatSession(projectId);
            setStoredSessionId('generate', sessionData.sessionId);
          }
        } else {
          sessionData = await getLatestChatSession(projectId);
          setStoredSessionId('generate', sessionData.sessionId);
        }
        
        setSessionId(sessionData.sessionId);
        setQuota({ dailyCalls: sessionData.dailyCalls, maxDailyCalls: sessionData.maxDailyCalls });
        const restored: ChatBubble[] = (sessionData.messages || []).map((m: any) => {
          const code = extractFirstCodeBlock(m.content);
          let content = m.content;
          if (code) {
            content = content.replace(/```[\s\S]*?```/, '').trim();
          }
          return { id: crypto.randomUUID(), role: m.role, content, code };
        });
        setMessages(restored);
        const sList = await listChatSessions(projectId);
        setSessions(sList);
      } else {
        // Try to load stored session first, fallback to latest
        const storedSessionId = getStoredSessionId('explain');
        let sessionData;
        
        if (storedSessionId) {
          try {
            sessionData = await getExplainSessionById(storedSessionId, projectId);
            // Get quota info from latest session
            const latest = await getLatestExplainSession(projectId);
            sessionData.dailyCalls = latest.dailyCalls;
            sessionData.maxDailyCalls = latest.maxDailyCalls;
          } catch (e) {
            // If stored session doesn't exist, fallback to latest
            sessionData = await getLatestExplainSession(projectId);
            setStoredSessionId('explain', sessionData.sessionId);
          }
        } else {
          sessionData = await getLatestExplainSession(projectId);
          setStoredSessionId('explain', sessionData.sessionId);
        }
        
        setSessionId(sessionData.sessionId);
        setQuota({ dailyCalls: sessionData.dailyCalls, maxDailyCalls: sessionData.maxDailyCalls });
        const restored: ChatBubble[] = (sessionData.messages || []).map((m: any) => ({
          id: crypto.randomUUID(), 
          role: m.role, 
          content: m.content, 
          code: null, 
          diff: null,
          parsedContent: m.role === 'model' ? parseContentWithCodeBlocks(m.content) : undefined
        }));
        setMessages(restored);
        const sList = await listExplainSessions(projectId);
        setExplainSessions(sList);
      }
    } catch {}
  };

  useEffect(() => {
    loadSessions();
  }, [activeTab]);

  async function switchSession(id: string) {
    try {
      if (activeTab === 'generate') {
        const data = await getChatSessionById(id, projectId);
        // Get quota info from latest session since getChatSessionById doesn't include it
        const latest = await getLatestChatSession(projectId);
        setSessionId(data.sessionId);
        setStoredSessionId('generate', data.sessionId); // Save to localStorage
        setQuota({ dailyCalls: latest.dailyCalls, maxDailyCalls: latest.maxDailyCalls });
        const restored: ChatBubble[] = (data.messages || []).map((m: any) => {
          const code = extractFirstCodeBlock(m.content);
          let content = m.content;
          if (code) {
            content = content.replace(/```[\s\S]*?```/, '').trim();
          }
          return { id: crypto.randomUUID(), role: m.role, content, code };
        });
        setMessages(restored);
      } else {
        const data = await getExplainSessionById(id, projectId);
        // Get quota info from latest session since getExplainSessionById doesn't include it
        const latest = await getLatestExplainSession(projectId);
        setSessionId(data.sessionId);
        setStoredSessionId('explain', data.sessionId); // Save to localStorage
        setQuota({ dailyCalls: latest.dailyCalls, maxDailyCalls: latest.maxDailyCalls });
        const restored: ChatBubble[] = (data.messages || []).map((m: any) => ({
          id: crypto.randomUUID(), 
          role: m.role, 
          content: m.content, 
          code: null, 
          diff: null,
          parsedContent: m.role === 'model' ? parseContentWithCodeBlocks(m.content) : undefined
        }));
        setMessages(restored);
      }
    } catch {}
  }

  useEffect(() => {
    const offList = aiBus.on('editor:fileList', ({ files }) => {
      setAvailableFiles(files || []);
      if (!isContextSelected && activeFile) setSelectedContextPath(activeFile);
    });
    aiBus.emit('ai:requestFileList', undefined as any);
    return () => offList();
  }, [selectedContextPath, activeFile]);

  useEffect(() => {
    const offSel = aiBus.on('editor:selection', ({ text }) => {
      setSelectedCode(text || "");
      // Auto-populate explain textbox with selected code when in explain tab
      if (activeTab === 'explain' && text && text.trim()) {
        setExplainInput(`Explain the following code:\n\n\`\`\`\n${text}\n\`\`\``);
      }
    });
    return () => offSel();
  }, [activeTab]);

  function requestSelectionExplain() {
    const content = explainInput.trim();
    if (!content) return;
    setExplainInput(""); // Clear the textbox after sending
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content, code: null, diff: null }]);
    sendToModel(content);
  }

  async function sendToModel(userContent: string) {
    if (!canUseAI) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', content: 'AI is restricted to owners and editors.' }]);
      return;
    }
    setLoading(true);
    try {
      // pull chosen file (dropdown) or fallback to active file as context
      let fileContext: FileContext | undefined;
      const waitFile = new Promise<FileContext>((resolve) => {
        const off = aiBus.on('editor:fileContext', (fc) => {
          off();
          resolve({ path: fc.path || '', content: fc.content });
        });
        if (selectedContextPath && selectedContextPath !== activeFile) {
          aiBus.emit('ai:requestSpecificFile', { path: selectedContextPath } as any);
        } else {
          aiBus.emit('ai:requestFileContext', undefined as any);
        }
        // safety fallback
        setTimeout(() => { off(); resolve({ path: selectedContextPath || activeFile || '', content: '' }); }, 600);
      });
      fileContext = await waitFile;

      // Get last 10 messages for context (excluding system messages)
      const recentMessages = messages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const history: ChatMessage[] = [...recentMessages, { role: 'user', content: userContent }];

      let resp;
      if (activeTab === 'generate') {
        resp = await chatWithGemini(history, sessionId, fileContext, projectId);
      } else {
        resp = await chatWithGeminiExplain(history, sessionId, fileContext, projectId);
      }
      
      if (resp.sessionId && resp.sessionId !== sessionId) {
        setSessionId(resp.sessionId);
        setStoredSessionId(activeTab, resp.sessionId); // Save new session ID to localStorage
      }
      if (typeof resp.dailyCalls === 'number' && typeof resp.maxDailyCalls === 'number') setQuota({ dailyCalls: resp.dailyCalls, maxDailyCalls: resp.maxDailyCalls });
      
      let reply = resp.text || '';
      const code = extractFirstCodeBlock(reply);
      if (code) {
        // remove the first fenced code block from the markdown so we don't duplicate
        const fenced = new RegExp("```" + (code.lang || '') + "\\n[\\s\\S]*?```", code.lang ? '' : '');
        reply = reply.replace(/```[\s\S]*?```/, '').trim();
      }
      
      // Check if we have file updates to show diff (only for generation)
      let diff = null;
      if (activeTab === 'generate' && resp.updatedFileContent && resp.originalFileContent && fileContext?.content && fileContext.content.trim()) {
        diff = {
          oldCode: resp.originalFileContent,
          newCode: resp.updatedFileContent,
          fileName: fileContext.path || 'active file'
        };
      }
      
      // Parse the reply content for code blocks (only for explain tab)
      const parsedContent = activeTab === 'explain' ? parseContentWithCodeBlocks(reply) : undefined;
      
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        content: reply, 
        code, 
        diff,
        parsedContent 
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', content: `Error: ${e.message || e}` }]);
    } finally {
      setLoading(false);
      queueMicrotask(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }));
    }
  }

  function handleSend() {
    const currentInput = activeTab === 'generate' ? generateInput : explainInput;
    const setCurrentInput = activeTab === 'generate' ? setGenerateInput : setExplainInput;
    
    const content = currentInput.trim();
    if (!content) return;
    setCurrentInput("");
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content }]);
    void sendToModel(content);
  }

  function applyCode(code?: string) {
    if (!code) return;
    aiBus.emit('ai:applyGenerated', { code, strategy: 'replaceFile' });
  }

  function applyDiff(newCode: string) {
    aiBus.emit('ai:applyGenerated', { code: newCode, strategy: 'replaceFile' });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs and controls */}
      <div className="border-b border-gray-800 bg-gray-900/95 px-3 flex flex-col items-center">
        <div className="w-full flex justify-center items-center gap-1 rounded-lg bg-gray-800 p-1 border-b border-gray-600 bg-gray-900/95">
          <button className={`px-3 py-1 text-sm border border-gray-600 rounded-md ${activeTab==='generate' ? 'bg-gray-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`} onClick={() => {
            setActiveTab('generate');
            // setExplainInput(""); // Clear explain input when switching to generate
          }}>Code generation</button>
          <button className={`px-3 py-1 text-sm border border-gray-600 rounded-md ${activeTab==='explain' ? 'bg-gray-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`} onClick={() => {
            setActiveTab('explain');
            // setGenerateInput(""); // Clear generate input when switching to explain
            // Auto-populate with selected code if available and textbox is empty
            if (selectedCode.trim() && !explainInput.trim()) {
              setExplainInput(`Explain the following code:\n\n\`\`\`\n${selectedCode}\n\`\`\``);
            }
          }}>Code explanation</button>
        </div>
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-1">
          <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">{`Quota: ${quota.maxDailyCalls - quota.dailyCalls}/${quota.maxDailyCalls}`}</div>
          <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
            {(activeTab === 'generate' ? sessions : explainSessions).slice(0,2).map(s => (
              <button
                key={s.id}
                type="button"
                className={`text-xs text-gray-300 px-2 py-[2px] rounded-md hover:text-white hover:bg-gray-600 whitespace-pre-wrap ${s.id === sessionId ? 'bg-gray-500 text-white' : 'bg-gray-700'}`}
                onClick={() => switchSession(s.id)}
                title={s.title || 'Chat'}
              >
                {s.title || 'Chat'}
              </button>
            ))}
            {(activeTab === 'generate' ? sessions : explainSessions).length > 2 && (
              <select
                className="bg-gray-800 border border-gray-700 text-xs text-gray-200 px-1 py-1 rounded-lg outline-none w-12 max-w-[80px]"
                onChange={(e) => e.target.value && switchSession(e.target.value)}
                defaultValue=""
                title="More chats"
              >
                <option value="" disabled>+{((activeTab === 'generate' ? sessions : explainSessions).length - 2)}</option>
                {(activeTab === 'generate' ? sessions : explainSessions).slice(2).map(s => (
                  <option key={s.id} value={s.id}>{s.title || 'Chat'}</option>
                ))}
              </select>
            )}
          </div>
          <button
            type="button"
            className="flex items-center border border-gray-700 rounded-md bg-gray-800 hover:bg-gray-700 text-xs p-1 px-2 ml-auto sm:ml-0"
            title="New Chat"
            onClick={async () => {
              if (activeTab === 'generate') {
                const s = await createNewChatSession(projectId);
                setSessionId(s.sessionId);
                setStoredSessionId('generate', s.sessionId); // Save to localStorage
                setMessages([]);
                setQuota({ dailyCalls: s.dailyCalls, maxDailyCalls: s.maxDailyCalls });
                try { const sList = await listChatSessions(projectId); setSessions(sList); } catch {}
              } else {
                const s = await createNewExplainSession(projectId);
                setSessionId(s.sessionId);
                setStoredSessionId('explain', s.sessionId); // Save to localStorage
                setMessages([]);
                setQuota({ dailyCalls: s.dailyCalls, maxDailyCalls: s.maxDailyCalls });
                try { const sList = await listExplainSessions(projectId); setExplainSessions(sList); } catch {}
              }
            }}
          >
            <FiPlus />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-auto px-3 py-1 space-y-2 bg-black">
        {messages.length === 0 && activeTab === 'generate' && (
          <div className="text-sm text-gray-400 flex flex-col items-center justify-center h-full">
            <Bot size={18} className="size-20 text-white" />
            Describe what you want to generate
            <p>You can give context file as well</p>
          </div>
        )}
        {messages.length === 0 && activeTab === 'explain' && (
          <div className="text-sm text-gray-400 flex flex-col items-center justify-center h-full">
            <Bot size={18} className="size-20 text-white" />
            Ask coding questions, explain concepts, or get tech help.
            <p className="text-xs mt-2">Or select code in the editor and click "Explain selection" to analyze selected code.</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap break-words overflow-wrap-anywhere ${m.role === 'user' ? 'ml-auto bg-blue-600/20 border border-blue-700' : m.role === 'model' ? 'bg-gray-800 border border-gray-700' : 'bg-amber-900/20 border border-amber-800'}`}>
            <div className="text-xs mb-1 text-gray-400">{m.role === 'user' ? 'You' : m.role === 'model' ? 'AI' : 'System'}</div>
            
            {/* Render parsed content for explain tab, or regular content for other tabs */}
            {m.parsedContent && activeTab === 'explain' ? (
              <div className="text-sm leading-relaxed prose prose-invert max-w-none break-words overflow-wrap-anywhere">
                {m.parsedContent.map((part, index) => (
                  <div key={index}>
                    {part.type === 'text' ? (
                      <div className="mb-3 break-words overflow-wrap-anywhere">
                        <ReactMarkdown 
                          components={{
                            p: ({children}) => <p className="break-words overflow-wrap-anywhere">{children}</p>,
                            pre: ({children}) => <pre className="break-words overflow-wrap-anywhere whitespace-pre-wrap">{children}</pre>,
                            code: ({children}) => <code className="break-words overflow-wrap-anywhere">{children}</code>
                          }}
                        >
                          {part.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="mt-3 mb-3 border border-gray-700 rounded">
                        <div className="text-xs px-2 py-1 border-b border-gray-700 text-gray-400 flex items-center justify-between">
                          <span>{part.language || 'code'}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(part.content)}>Copy</Button>
                          </div>
                        </div>
                        <Textarea 
                          readOnly 
                          value={part.content} 
                          className="rounded-none bg-white text-black resize-none"
                          style={{ 
                            height: `${calculateCodeBlockHeight(part.content)}px`,
                            minHeight: '80px',
                            maxHeight: '600px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm leading-relaxed prose prose-invert max-w-none break-words overflow-wrap-anywhere">
                <ReactMarkdown 
                  components={{
                    p: ({children}) => <p className="break-words overflow-wrap-anywhere">{children}</p>,
                    pre: ({children}) => <pre className="break-words overflow-wrap-anywhere whitespace-pre-wrap">{children}</pre>,
                    code: ({children}) => <code className="break-words overflow-wrap-anywhere">{children}</code>
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            )}
            
            {/* Show diff viewer if available */}
            {m.diff && (
              <div className="mt-3">
                <DiffViewer
                  oldCode={m.diff.oldCode}
                  newCode={m.diff.newCode}
                  fileName={m.diff.fileName}
                  onApply={() => applyDiff(m.diff!.newCode)}
                  onSeeChanges={() => {
                    aiBus.emit('ai:showDiff', {
                      oldCode: m.diff!.oldCode,
                      newCode: m.diff!.newCode,
                      fileName: m.diff!.fileName
                    });
                  }}
                  onReject={() => {
                    // Remove the diff from the message
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id 
                        ? { ...msg, diff: null }
                        : msg
                    ));
                  }}
                />
              </div>
            )}
            
            {/* Show code block if available and no diff (for generate tab) */}
            {m.code && !m.diff && activeTab === 'generate' && (
              <div className="mt-2 border border-gray-700 rounded">
                <div className="text-xs px-2 py-1 border-b border-gray-700 text-gray-400 flex items-center justify-between">
                  <span>{m.code.lang || 'code'}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(m.code?.code || '')}>Copy</Button>
                    <Button size="sm" variant="secondary" onClick={() => applyCode(m.code?.code)}>Apply</Button>
                  </div>
                </div>
                <Textarea 
                  readOnly 
                  value={m.code.code} 
                  className="rounded-none bg-white text-black resize-none"
                  style={{ 
                    height: `${calculateCodeBlockHeight(m.code.code)}px`,
                    minHeight: '80px',
                    maxHeight: '600px'
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-400">AI is thinking…</div>
        )}
      </div>
      <div className="border-t border-gray-800 p-2 bg-gray-900 flex flex-col gap-2">
        <div className="flex justify-start items-center gap-3">
          <div className="text-xs text-gray-400 font-medium">Context File</div>
          <select
            className="bg-gray-800 border border-gray-700 text-xs text-gray-200 px-3 py-1 rounded-md outline-none hover:border-gray-600 focus:border-blue-500 transition-colors"
            value={selectedContextPath}
            onChange={(e) => {
              setSelectedContextPath(e.target.value);
              setIsContextSelected(true);
            }}
            onFocus={() => aiBus.emit('ai:requestFileList', undefined as any)}
            title="Select file for context"
          >
            {availableFiles.map(f => (
              <option key={f} value={f} className="text-xs">{f}</option>
            ))}
          </select>
        </div>
        <Textarea
          value={activeTab === 'generate' ? generateInput : explainInput}
          onChange={(e) => {
            if (activeTab === 'generate') {
              setGenerateInput(e.target.value);
            } else {
              setExplainInput(e.target.value);
            }
          }}
          placeholder={activeTab==='generate' ? "Describe the code you want…" : "Ask coding questions, explain concepts, or get tech help…"}
          className="flex-1 max-h-96 text-white bg-gray-700"
          rows={2}
        />
        <div className="flex justify-between items-center gap-3 mt-1 pb-2">
          {activeTab === 'explain' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={requestSelectionExplain}
              disabled={!selectedCode.trim() || (!!selectedCode.trim() && !explainInput.trim()) || loading || quota.dailyCalls >= quota.maxDailyCalls}
              title={!explainInput.trim() ? "Select code in the editor or type a question" : "Send explanation request"}
              className="flex items-center gap-2 bg-blue-600/10 border-blue-500/30 text-blue-300 hover:bg-blue-600/20 hover:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Explain Selection
            </Button>
          )}
          <div className="flex-1"></div>
          <Button 
            onClick={handleSend} 
            disabled={loading || !(activeTab === 'generate' ? generateInput : explainInput).trim() || quota.dailyCalls >= quota.maxDailyCalls}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            size="sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {activeTab === 'generate' ? 'Generating...' : 'Asking...'}
              </>
            ) : (
              <>
                {activeTab === 'generate' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Generate
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ask
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


