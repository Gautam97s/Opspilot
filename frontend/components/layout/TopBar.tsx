"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Settings, MessageSquare, Wrench, X, Search, Plus, Circle, Github } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToolDef = {
    name: string;
    description?: string | null;
    inputSchema: Record<string, unknown>;
};

export type SessionSummary = {
    id: string;
    name: string;
    updatedAt: number;
    activeRepo?: string;
};

type McpServerStatus = 'online' | 'syncing' | 'offline';
export type McpServerSummary = {
    id: string;
    name: string;
    status: McpServerStatus;
    detail?: string;
};

interface TopBarProps {
    tools: ToolDef[];
    toolsStatus: 'idle' | 'loading' | 'ready' | 'error';
    onRefreshTools: () => void;

    sessions: SessionSummary[];
    activeSessionId: string;
    onSelectSession: (sessionId: string) => void;
    onCreateSession: () => void;

    mcpServers: McpServerSummary[];
    activeRepo?: string;
    onConnectRepo: (repoUrl: string, branch?: string) => void | Promise<void>;
    isConnectingRepo?: boolean;
}

function statusColor(status: McpServerStatus) {
    if (status === 'online') return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]';
    if (status === 'syncing') return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]';
    return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.35)]';
}

function toolSortWeight(name: string) {
    if (name.startsWith('github_') || name.startsWith('git_')) return 0;
    if (name.startsWith('k8s_')) return 1;
    if (name.startsWith('docker_')) return 2;
    return 3;
}

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

export function TopBar({
    tools,
    toolsStatus,
    onRefreshTools,
    sessions,
    activeSessionId,
    onSelectSession,
    onCreateSession,
    mcpServers,
    activeRepo,
    onConnectRepo,
    isConnectingRepo = false,
}: TopBarProps) {
    const [toolsOpen, setToolsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [connectRepoOpen, setConnectRepoOpen] = useState(false);
    const [toolQuery, setToolQuery] = useState('');
    const [copied, setCopied] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('');

    const activeSession = useMemo(
        () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
        [sessions, activeSessionId]
    );

    const filteredTools = useMemo(() => {
        const q = toolQuery.trim().toLowerCase();
        const matchingTools = !q ? tools : tools.filter(t =>
            t.name.toLowerCase().includes(q) ||
            (t.description ?? '').toLowerCase().includes(q)
        );
        return matchingTools.slice().sort((a, b) => {
            const weightDiff = toolSortWeight(a.name) - toolSortWeight(b.name);
            if (weightDiff !== 0) return weightDiff;
            return a.name.localeCompare(b.name);
        });
    }, [tools, toolQuery]);

    const groupedTools = useMemo(() => {
        const groups = new Map<string, ToolDef[]>();
        for (const tool of filteredTools) {
            const category = toolCategory(tool.name);
            const items = groups.get(category) ?? [];
            items.push(tool);
            groups.set(category, items);
        }
        return Array.from(groups.entries());
    }, [filteredTools]);

    useEffect(() => {
        if (toolsOpen && (toolsStatus === 'idle' || toolsStatus === 'error')) {
            onRefreshTools();
        }
    }, [toolsOpen, toolsStatus, onRefreshTools]);

    const closeAll = () => {
        setToolsOpen(false);
        setSettingsOpen(false);
        setChatOpen(false);
        setConnectRepoOpen(false);
    };

    const handleConnectRepo = async () => {
        const trimmedRepoUrl = repoUrl.trim();
        const trimmedBranch = branch.trim();
        if (!trimmedRepoUrl || isConnectingRepo) return;
        await onConnectRepo(trimmedRepoUrl, trimmedBranch || undefined);
        setRepoUrl('');
        setBranch('');
        closeAll();
    };

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-8 py-6">
                {/* Left: Tools */}
                <button
                    onClick={() => { closeAll(); setToolsOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white/70 transition-all bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white backdrop-blur-md"
                >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Tools</span>
                </button>

                {/* Center: Active Session */}
                <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-3 text-[10px] tracking-wide text-white/40 font-mono">
                    <span>Session</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <button
                        onClick={() => { closeAll(); setChatOpen(true); }}
                        className="flex items-center gap-2 group hover:text-white/70 transition-colors"
                        title="Open chat sessions"
                    >
                        <span className="truncate max-w-[240px]">{activeSession?.name ?? 'Untitled'}</span>
                    </button>
                    <button
                        onClick={() => copyText(activeSession?.id ?? '')}
                        className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                        title="Copy session id"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                    {activeRepo && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="truncate max-w-[220px] text-white/55">Repo {activeRepo}</span>
                        </>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { closeAll(); setConnectRepoOpen(true); }}
                        className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
                        title={activeRepo ? `Active repo: ${activeRepo}` : 'Connect GitHub repo'}
                    >
                        <Github className="w-3.5 h-3.5" />
                        <span className="max-w-[140px] truncate">{activeRepo ? activeRepo : 'Connect Repo'}</span>
                    </button>
                    <button
                        onClick={() => { closeAll(); setSettingsOpen(true); }}
                        className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                    </button>
                    <button
                        onClick={() => { closeAll(); setChatOpen(true); }}
                        className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                    </button>
                </div>
            </header>

            {/* Modals */}
            {(toolsOpen || settingsOpen || chatOpen || connectRepoOpen) && (
                <div className="fixed inset-0 z-50">
                    <button
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeAll}
                        aria-label="Close overlay"
                    />

                    {/* Tools modal */}
                    {toolsOpen && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-3xl">
                            <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-sm text-white/80">
                                        <Wrench className="w-4 h-4 text-white/60" />
                                        <span className="font-medium">Tools</span>
                                        <span className="text-xs text-white/30">
                                            {toolsStatus === 'loading' && 'Loading…'}
                                            {toolsStatus === 'error' && 'Backend offline'}
                                            {toolsStatus === 'ready' && `${tools.length} available`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={onRefreshTools}
                                            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            Refresh
                                        </button>
                                        <button
                                            onClick={closeAll}
                                            className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                            aria-label="Close tools"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 border border-white/10">
                                        <Search className="w-4 h-4 text-white/40" />
                                        <input
                                            value={toolQuery}
                                            onChange={(e) => setToolQuery(e.target.value)}
                                            placeholder="Search tools…"
                                            className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
                                        />
                                        {copied && <span className="text-[11px] text-emerald-400">Copied</span>}
                                    </div>

                                    <div className="mt-4 max-h-[55vh] overflow-y-auto space-y-5">
                                        {groupedTools.map(([category, categoryTools]) => (
                                            <div key={category}>
                                                <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                                                    {category}
                                                </div>
                                                <div className="space-y-2">
                                                    {categoryTools.map((t) => (
                                                        <div key={t.name} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <div className="font-mono text-xs text-white/80 truncate">/{t.name}</div>
                                                                    {t.description && (
                                                                        <div className="mt-1 text-xs text-white/40 line-clamp-2">
                                                                            {t.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => copyText(`/${t.name}`)}
                                                                    className="shrink-0 px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {toolsStatus === 'ready' && filteredTools.length === 0 && (
                                            <div className="text-xs text-white/40 px-2 py-6 text-center">
                                                No tools match your search.
                                            </div>
                                        )}
                                        {toolsStatus === 'error' && (
                                            <div className="text-xs text-white/40 px-2 py-6 text-center">
                                                Backend unreachable. Start the server on <span className="font-mono text-white/60">localhost:8000</span>.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connect repo modal */}
                    {connectRepoOpen && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-xl">
                            <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-sm text-white/80">
                                        <Github className="w-4 h-4 text-white/60" />
                                        <span className="font-medium">Connect GitHub Repo</span>
                                    </div>
                                    <button
                                        onClick={closeAll}
                                        className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                        aria-label="Close connect repo"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wider text-white/35 mb-2">Repository URL</div>
                                        <input
                                            value={repoUrl}
                                            onChange={(e) => setRepoUrl(e.target.value)}
                                            placeholder="https://github.com/owner/repo.git"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wider text-white/35 mb-2">Branch (optional)</div>
                                        <input
                                            value={branch}
                                            onChange={(e) => setBranch(e.target.value)}
                                            placeholder="main"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                                        />
                                    </div>
                                    <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/45">
                                        The repo will be cloned into the managed local workspace for this session, then repo tools will use it automatically.
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={closeAll}
                                            className="px-4 py-2 text-xs rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => { void handleConnectRepo(); }}
                                            disabled={!repoUrl.trim() || isConnectingRepo}
                                            className={cn(
                                                "px-4 py-2 text-xs rounded-full border transition-colors",
                                                repoUrl.trim() && !isConnectingRepo
                                                    ? "bg-white text-black border-white hover:bg-white/90"
                                                    : "bg-white/10 text-white/30 border-white/10 cursor-not-allowed"
                                            )}
                                        >
                                            {isConnectingRepo ? 'Connecting...' : 'Connect Repo'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings modal */}
                    {settingsOpen && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-xl">
                            <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-sm text-white/80">
                                        <Settings className="w-4 h-4 text-white/60" />
                                        <span className="font-medium">Settings</span>
                                    </div>
                                    <button
                                        onClick={closeAll}
                                        className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                        aria-label="Close settings"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-5">
                                    <div className="mb-5 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-wider text-white/35 mb-1">Active Repo</div>
                                        <div className="text-sm text-white/80">
                                            {activeRepo ? activeRepo : "No repo connected in this session"}
                                        </div>
                                    </div>
                                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                                        MCP Servers
                                    </div>
                                    <div className="space-y-2">
                                        {mcpServers.map((s) => (
                                            <div
                                                key={s.id}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm text-white/80 truncate">{s.name}</div>
                                                    {s.detail && <div className="text-xs text-white/40 truncate mt-0.5">{s.detail}</div>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("w-2 h-2 rounded-full", statusColor(s.status))} />
                                                    <span className="text-xs text-white/50 capitalize">{s.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat modal */}
                    {chatOpen && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-xl">
                            <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-sm text-white/80">
                                        <MessageSquare className="w-4 h-4 text-white/60" />
                                        <span className="font-medium">Chat</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={onCreateSession}
                                            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            New
                                        </button>
                                        <button
                                            onClick={closeAll}
                                            className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                            aria-label="Close chat"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                                        Recent Sessions
                                    </div>
                                    <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                                        {sessions
                                            .slice()
                                            .sort((a, b) => b.updatedAt - a.updatedAt)
                                            .map((s) => {
                                                const active = s.id === activeSessionId;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => { onSelectSession(s.id); closeAll(); }}
                                                        className={cn(
                                                            "w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border transition-colors",
                                                            active
                                                                ? "bg-white/10 border-white/20"
                                                                : "bg-white/5 border-white/10 hover:bg-white/8"
                                                        )}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-white/80 truncate">{s.name}</div>
                                                            <div className="text-xs text-white/40 truncate mt-0.5 font-mono">
                                                                {s.activeRepo ? `${s.id} · ${s.activeRepo}` : s.id}
                                                            </div>
                                                        </div>
                                                        <Circle className={cn("w-3.5 h-3.5", active ? "text-emerald-400" : "text-white/20")} />
                                                    </button>
                                                );
                                            })}
                                        {sessions.length === 0 && (
                                            <div className="text-xs text-white/40 px-2 py-6 text-center">
                                                No sessions yet. Create one to get started.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
