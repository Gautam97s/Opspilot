"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Background } from '@/components/layout/Background';
import { BottomBar } from '@/components/layout/BottomBar';
import { TopBar, type SessionSummary, type McpServerSummary } from '@/components/layout/TopBar';
import { InputArea } from '@/components/chat/InputArea';
import { MessageBubble, type Message } from '@/components/chat/MessageBubble';
import { Check, ShieldAlert, X } from 'lucide-react';

type ToolDef = {
  name: string;
  description?: string | null;
  inputSchema: Record<string, unknown>;
};

type ToolCallContent = {
  text?: string;
};

type ToolCallResponse = {
  error?: { message?: string } | null;
  result?: {
    isError?: boolean;
    content?: ToolCallContent[];
  } | null;
};

type PendingApproval = {
  requestId: string;
  toolName: string;
  args: Record<string, unknown>;
  assistantMsgId: string;
};

const REPO_AWARE_TOOLS = new Set([
  'git_repo_status',
  'git_repo_branches',
  'git_recent_commits',
]);

function toolCategory(name: string) {
  if (name.startsWith('github_') || name.startsWith('git_')) return 'Git & GitHub';
  if (name.startsWith('k8s_')) return 'Kubernetes';
  if (name.startsWith('docker_')) return 'Docker';
  if (name === 'list_directory' || name === 'read_file' || name === 'search_logs') return 'Files & Logs';
  if (
    name === 'list_local_processes' ||
    name === 'get_disk_usage' ||
    name === 'get_system_info' ||
    name === 'check_port'
  ) {
    return 'System';
  }
  return 'Other';
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function parseSlashCommand(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;

  const rest = trimmed.slice(1).trim();
  if (!rest) return null;

  const firstSpace = rest.indexOf(' ');
  const name = (firstSpace === -1 ? rest : rest.slice(0, firstSpace)).trim();
  const argText = (firstSpace === -1 ? '' : rest.slice(firstSpace + 1)).trim();

  return { name, argText };
}

function makeSessionId() {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function deriveManagedRepoName(repoUrl: string) {
  const trimmed = repoUrl.trim();
  const withoutQuery = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
  const parts = withoutQuery.split('/').filter(Boolean);
  const rawName = parts[parts.length - 1] ?? trimmed;
  return rawName.endsWith('.git') ? rawName.slice(0, -4) : rawName;
}

export default function Home() {
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [toolsStatus, setToolsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingRepo, setIsConnectingRepo] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [messages, setMessages] = useState<Message[]>(() => ([
    {
      // Deterministic initial render to avoid Next.js hydration mismatch.
      id: "welcome",
      role: 'assistant',
      content:
        [
          "OpsPilot UI is connected to the backend tool API.",
          "",
          "Try:",
          "- `/tools` to list tools",
          "- `/<toolName> {\"arg\": \"value\"}` to call a tool",
          "",
          "Example:",
          "- `/list_local_processes`",
          "- `/read_file {\"path\": \"README.md\"}` (path must be allowed by policy)",
        ].join("\n"),
      // Fixed timestamp to keep server/client HTML identical on first paint.
      timestamp: new Date("1970-01-01T00:00:00.000Z"),
      status: 'completed',
    },
  ]));

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMessageCountRef = useRef(messages.length);

  const toolNames = useMemo(() => new Set(tools.map(t => t.name)), [tools]);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [sessions, activeSessionId]
  );
  const activeRepo = activeSession?.activeRepo;

  // Sessions persistence (simple local storage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('opspilot.sessions');
      const parsed = raw ? (JSON.parse(raw) as SessionSummary[]) : [];
      const existing = Array.isArray(parsed) ? parsed : [];

      const defaultSession: SessionSummary = { id: 'default', name: 'Default', updatedAt: Date.now() };
      const withDefault = existing.some(s => s.id === 'default') ? existing : [defaultSession, ...existing];

      setSessions(withDefault);

      const savedActive = localStorage.getItem('opspilot.activeSessionId');
      if (savedActive && withDefault.some(s => s.id === savedActive)) {
        setActiveSessionId(savedActive);
      } else {
        setActiveSessionId('default');
      }
    } catch {
      setSessions([{ id: 'default', name: 'Default', updatedAt: Date.now() }]);
      setActiveSessionId('default');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('opspilot.sessions', JSON.stringify(sessions));
    } catch { }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem('opspilot.activeSessionId', activeSessionId);
    } catch { }
  }, [activeSessionId]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      return;
    }

    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Track whether user is near bottom (so we only auto-scroll then).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      stickToBottomRef.current = distanceFromBottom < 96;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Keep pinned to bottom when new messages arrive (and after content reflow).
  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;

    const behavior: ScrollBehavior = messages.length > lastMessageCountRef.current ? 'smooth' : 'auto';
    scrollToBottom(behavior);
    requestAnimationFrame(() => scrollToBottom(behavior));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom(behavior));
    });
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Also pin when the scroll container changes size (e.g., fonts/load/layout).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      if (!stickToBottomRef.current) return;
      scrollToBottom('auto');
      requestAnimationFrame(() => scrollToBottom('auto'));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function refreshTools() {
    setToolsStatus('loading');
    try {
      const resp = await fetch('/api/tools/list', { cache: 'no-store' });
      const data = await resp.json();
      const list = (data?.result?.tools ?? []) as ToolDef[];
      setTools(list);
      setToolsStatus('ready');
    } catch {
      setToolsStatus('error');
    }
  }

  useEffect(() => {
    refreshTools();
  }, []);

  async function callTool(toolName: string, args: Record<string, unknown>) {
    const resp = await fetch('/api/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: toolName, arguments: args }),
    });
    return await resp.json();
  }

  async function approveRequest(requestId: string) {
    const resp = await fetch(`/api/approvals/${requestId}/approve`, { method: 'POST' });
    return await resp.json();
  }

  async function rejectRequest(requestId: string) {
    const resp = await fetch(`/api/approvals/${requestId}/reject`, { method: 'POST' });
    return await resp.json();
  }

  async function executeApprovedRequest(requestId: string) {
    const resp = await fetch(`/api/approvals/${requestId}/execute`, { method: 'POST' });
    const data = await resp.json();
    return { ok: resp.ok, data };
  }

  const mcpServers: McpServerSummary[] = useMemo(() => {
    const backendStatus: McpServerSummary['status'] =
      toolsStatus === 'ready' ? 'online' : toolsStatus === 'loading' ? 'syncing' : toolsStatus === 'error' ? 'offline' : 'syncing';
    return [
      { id: 'local', name: 'Shell / Local', status: 'online', detail: 'Built-in tools' },
      { id: 'mcp-backend', name: 'OpsPilot MCP Backend', status: backendStatus, detail: 'http://localhost:8000' },
      { id: 'aws', name: 'AWS / Prod', status: 'offline', detail: 'Not configured' },
      { id: 'postgres', name: 'Postgres', status: 'syncing', detail: 'Not connected' },
    ];
  }, [toolsStatus]);

  const createSession = () => {
    const id = makeSessionId();
    const s: SessionSummary = { id, name: `Session ${sessions.length + 1}`, updatedAt: Date.now() };
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(id);
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const connectRepoFromUi = async (repoUrl: string, branch?: string) => {
    const payload = branch
      ? `/github_connect_repo {"repo_url":"${repoUrl}","branch":"${branch}"}`
      : `/github_connect_repo {"repo_url":"${repoUrl}"}`;
    setIsConnectingRepo(true);
    try {
      await onSendMessage(payload);
    } finally {
      setIsConnectingRepo(false);
    }
  };

  const onSendMessage = async (text: string) => {
    // When user sends, always stick to bottom for the next update.
    stickToBottomRef.current = true;
    const userMsg: Message = { id: makeId(), role: 'user', content: text, timestamp: new Date(), status: 'completed' };
    setMessages((m) => [...m, userMsg]);

    // bump session recency
    setSessions((prev) => prev.map(s => s.id === activeSessionId ? { ...s, updatedAt: Date.now() } : s));

    const cmd = parseSlashCommand(text);
    setIsLoading(true);

    try {
      if (!cmd) {
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: 'assistant',
            content: "Tip: use `/tools` to list tools, or call a tool with `/<toolName> {jsonArgs}`.",
            timestamp: new Date(),
            status: 'completed',
          },
        ]);
        return;
      }

      if (cmd.name === 'tools') {
        if (toolsStatus !== 'ready') await refreshTools();
        const grouped = tools.reduce<Record<string, ToolDef[]>>((acc, tool) => {
          const category = toolCategory(tool.name);
          if (!acc[category]) acc[category] = [];
          acc[category].push(tool);
          return acc;
        }, {});

        const categoryOrder = ['Git & GitHub', 'Kubernetes', 'Docker', 'Files & Logs', 'System', 'Other'];
        const lines = tools.length
          ? categoryOrder
              .filter((category) => grouped[category]?.length)
              .map((category, index) => {
                const items = grouped[category]
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => `- \`${t.name}\`${t.description ? ` - ${t.description}` : ''}`)
                  .join('\n');
                const section = `#### ${category}\n${items}`;
                return index === 0 ? section : `\n${section}`;
              })
              .join('\n\n')
          : '(no tools returned)';

        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: 'assistant',
            content: `### Available tools\n\n${lines}`,
            timestamp: new Date(),
            status: 'completed',
          },
        ]);
        return;
      }

      if (toolsStatus !== 'ready') await refreshTools();
      if (!toolNames.has(cmd.name)) {
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: 'assistant',
            content: `Unknown tool: \`${cmd.name}\`. Run \`/tools\` to see what’s available.`,
            timestamp: new Date(),
            status: 'completed',
          },
        ]);
        return;
      }

      let args: Record<string, unknown> = {};
      if (cmd.argText) {
        try {
          args = JSON.parse(cmd.argText);
        } catch {
          setMessages((m) => [
            ...m,
            {
              id: makeId(),
              role: 'assistant',
              content: "Couldn’t parse JSON args. Use `/<toolName> {\"key\": \"value\"}`.",
              timestamp: new Date(),
              status: 'completed',
            },
          ]);
          return;
        }
      }

      if (REPO_AWARE_TOOLS.has(cmd.name) && !args.repo) {
        if (!activeRepo) {
          setMessages((m) => [
            ...m,
            {
              id: makeId(),
              role: 'assistant',
              content: "Connect a GitHub repo first with `/github_connect_repo {\"repo_url\":\"https://github.com/owner/repo.git\"}` before running repo commands.",
              timestamp: new Date(),
              status: 'completed',
            },
          ]);
          return;
        }
        args = { ...args, repo: activeRepo };
      }

      const assistantMsgId = makeId();
      setMessages((m) => [
        ...m,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: `Calling \`${cmd.name}\`...`,
          timestamp: new Date(),
          status: 'streaming',
          executionPlan: {
            title: 'Tool execution',
            steps: [
              { label: 'Validate request', status: 'completed' },
              { label: `Call ${cmd.name}`, status: 'running' },
              { label: 'Render result', status: 'pending' },
            ],
          },
        },
      ]);

      const result = (await callTool(cmd.name, args)) as ToolCallResponse;
      const content = (result?.result?.content ?? []) as ToolCallContent[];
      const outText = content.map((c) => c.text).filter(Boolean).join('\n') || JSON.stringify(result, null, 2);
      const approvalMatch = outText.match(/Approval required for `([^`]+)`\. Request id: ([a-f0-9-]+)/i);
      const approvalRequired = Boolean(result?.result?.isError && approvalMatch);

      if (approvalRequired && approvalMatch) {
        setPendingApproval({
          requestId: approvalMatch[2],
          toolName: cmd.name,
          args,
          assistantMsgId,
        });
      }

      if (cmd.name === 'github_connect_repo' && !result?.error && !approvalRequired) {
        const repoUrl = typeof args.repo_url === 'string' ? args.repo_url : '';
        const connectedRepo = deriveManagedRepoName(repoUrl);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? { ...session, activeRepo: connectedRepo, updatedAt: Date.now() }
              : session
          )
        );
      }

      setMessages((m) =>
        m.map((msg) => {
          if (msg.id !== assistantMsgId) return msg;
          return {
            ...msg,
            status: result?.error || approvalRequired ? 'error' : 'completed',
            content: [
              `### Tool: \`${cmd.name}\``,
              "",
              approvalRequired
                ? [
                    "Authorization is required before this tool can run.",
                    "",
                    `Request id: \`${approvalMatch?.[2]}\``,
                    "",
                    "Use the authorization dialog to approve or reject it.",
                  ].join("\n")
                : [
                    "```text",
                    outText,
                    "```",
                  ].join("\n"),
            ].join("\n"),
            executionPlan: {
              title: 'Tool execution',
              steps: [
                { label: 'Validate request', status: 'completed' },
                { label: `Call ${cmd.name}`, status: approvalRequired ? 'pending' : result?.error ? 'failed' : 'completed' },
                { label: 'Render result', status: approvalRequired ? 'pending' : result?.error ? 'failed' : 'completed' },
              ],
            },
          };
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePending = async () => {
    if (!pendingApproval || approvalAction) return;
    setApprovalAction('approve');
    try {
      await approveRequest(pendingApproval.requestId);
      const executed = await executeApprovedRequest(pendingApproval.requestId);
      const executionFailed = !executed.ok || Boolean(executed.data?.error);
      const attemptedRepoName =
        pendingApproval.toolName === 'github_connect_repo' && typeof pendingApproval.args.repo_url === 'string'
          ? deriveManagedRepoName(pendingApproval.args.repo_url)
          : null;
      const resultText = executionFailed
        ? executed.data?.error ?? JSON.stringify(executed.data, null, 2)
        : executed.data?.result ?? JSON.stringify(executed.data, null, 2);

      if (!executionFailed && pendingApproval.toolName === 'github_connect_repo') {
        const repoUrl = typeof pendingApproval.args.repo_url === 'string' ? pendingApproval.args.repo_url : '';
        const connectedRepo = deriveManagedRepoName(repoUrl);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? { ...session, activeRepo: connectedRepo, updatedAt: Date.now() }
              : session
          )
        );
      }

      if (executionFailed && attemptedRepoName) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id !== activeSessionId) return session;
            if (session.activeRepo !== attemptedRepoName) return session;
            const nextSession = { ...session };
            delete nextSession.activeRepo;
            nextSession.updatedAt = Date.now();
            return nextSession;
          })
        );
      }

      setMessages((current) =>
        current.map((msg) => {
          if (msg.id !== pendingApproval.assistantMsgId) return msg;
          return {
            ...msg,
            status: executionFailed ? 'error' : 'completed',
            content: [
              `### Tool: \`${pendingApproval.toolName}\``,
              "",
              executionFailed ? "Authorization approved, but tool execution failed." : "Authorization approved and tool executed.",
              "",
              "```text",
              resultText,
              "```",
            ].join("\n"),
            executionPlan: {
                title: 'Tool execution',
                steps: [
                  { label: 'Validate request', status: 'completed' },
                  { label: `Authorize ${pendingApproval.toolName}`, status: 'completed' },
                  { label: `Call ${pendingApproval.toolName}`, status: executionFailed ? 'failed' : 'completed' },
                  { label: 'Render result', status: executionFailed ? 'failed' : 'completed' },
                ],
              },
            };
        })
      );
      setPendingApproval(null);
    } finally {
      setApprovalAction(null);
    }
  };

  const handleRejectPending = async () => {
    if (!pendingApproval || approvalAction) return;
    setApprovalAction('reject');
    try {
      await rejectRequest(pendingApproval.requestId);
      setMessages((current) =>
        current.map((msg) => {
          if (msg.id !== pendingApproval.assistantMsgId) return msg;
          return {
            ...msg,
            status: 'error',
            content: [
              `### Tool: \`${pendingApproval.toolName}\``,
              "",
              "Authorization was denied.",
              "",
              `Request id: \`${pendingApproval.requestId}\``,
            ].join("\n"),
            executionPlan: {
              title: 'Tool execution',
              steps: [
                { label: 'Validate request', status: 'completed' },
                { label: `Authorize ${pendingApproval.toolName}`, status: 'failed' },
                { label: `Call ${pendingApproval.toolName}`, status: 'failed' },
                { label: 'Render result', status: 'failed' },
              ],
            },
          };
        })
      );
      setPendingApproval(null);
    } finally {
      setApprovalAction(null);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden selection:bg-[#ff4d00]/30 selection:text-white text-white">
      <Background />

      <div className="relative z-10 w-full min-h-screen flex flex-col">
        <TopBar
          tools={tools}
          toolsStatus={toolsStatus}
          onRefreshTools={refreshTools}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={selectSession}
          onCreateSession={createSession}
          mcpServers={mcpServers}
          activeRepo={activeRepo}
          onConnectRepo={connectRepoFromUi}
          isConnectingRepo={isConnectingRepo}
        />

        <main className="flex-1 min-h-0 flex pt-[88px] pb-[120px]">
          <div className="flex-1 min-h-0 flex flex-col min-w-0">
            <div className="px-4 lg:px-8 pt-6 pb-3 text-xs text-white/50">
              Backend tools:{" "}
              {toolsStatus === 'loading' && <span>loading…</span>}
              {toolsStatus === 'error' && <span>error (is backend on `localhost:8000`?)</span>}
              {toolsStatus === 'ready' && <span>{tools.length} available</span>}
            </div>

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-8 pb-8">
              <div className="max-w-4xl mx-auto pt-2">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                <div ref={bottomRef} aria-hidden="true" />
              </div>
            </div>

          </div>
        </main>

        <div className="fixed inset-x-0 bottom-[64px] z-50">
          <InputArea onSendMessage={onSendMessage} isLoading={isLoading} />
        </div>

        <BottomBar />
      </div>

      {pendingApproval && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[#101012]/95 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90">Authorization Required</div>
                  <div className="text-xs text-white/45">Review and approve this operation</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!approvalAction) setPendingApproval(null);
                }}
                className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
                aria-label="Close authorization dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Tool</div>
                <div className="mt-1 font-mono text-sm text-white/85">{pendingApproval.toolName}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Arguments</div>
                <pre className="mt-2 overflow-x-auto text-xs text-white/65">{JSON.stringify(pendingApproval.args, null, 2)}</pre>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-white/70">
                This tool needs authorization before it can run. Approving will execute the pending request immediately.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                onClick={() => { void handleRejectPending(); }}
                disabled={Boolean(approvalAction)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/30"
              >
                {approvalAction === 'reject' ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => { void handleApprovePending(); }}
                disabled={Boolean(approvalAction)}
                className="flex items-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-xs text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/20 disabled:text-white/40"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{approvalAction === 'approve' ? 'Authorizing...' : 'Authorize & Run'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
