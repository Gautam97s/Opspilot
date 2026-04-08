"use client";

import React from 'react';
import {
    Terminal,
    Box,
    Layers,
    Activity,
    GitBranch,
    Settings,
    Database,
    Cloud,
    ChevronDown,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    return (
        <div className={cn("flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-64 flex-shrink-0", className)}>
            {/* Project Selector */}
            <div className="p-4 border-b border-zinc-800">
                <button className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 rounded-md hover:bg-zinc-700 transition-colors">
                    <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-blue-500" />
                        <span>opspilot-platform</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* MCP Server Status */}
            <div className="px-4 py-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">MCP Servers</h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            <span>Shell / Local</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                            <span className="text-xs text-emerald-500">Online</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                            <Cloud className="w-4 h-4" />
                            <span>AWS / Prod</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                            <span className="text-xs text-emerald-500">Online</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            <span>Postgres</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span>
                            <span className="text-xs text-amber-500">Syncing</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tool Categories */}
            <div className="px-4 py-2 flex-1 overflow-y-auto">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tools</h3>
                <nav className="space-y-1">
                    {[
                        { icon: Terminal, label: 'Shell Commands', active: true },
                        { icon: Layers, label: 'Kubernetes' },
                        { icon: Box, label: 'Docker' },
                        { icon: Cloud, label: 'Terraform' },
                        { icon: GitBranch, label: 'CI/CD Pipelines' },
                        { icon: Activity, label: 'System Logs' },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className={cn(
                                "flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors group",
                                item.active
                                    ? "bg-zinc-800 text-white"
                                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4 mr-3", item.active ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-400")} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* History */}
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-3">Recent Sessions</h3>
                <nav className="space-y-1">
                    {[
                        'Deploy to Staging',
                        'Fix K8s CrashLoop',
                        'DB Migration v2.4',
                        'Log Analysis - Auth'
                    ].map((session) => (
                        <button
                            key={session}
                            className="flex items-center w-full px-3 py-2 text-sm text-zinc-400 rounded-md hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors truncate"
                        >
                            <History className="w-3 h-3 mr-3 text-zinc-600" />
                            <span className="truncate">{session}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        OP
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Ops Navigator</p>
                        <p className="text-xs text-zinc-500 truncate">DevOps Lead</p>
                    </div>
                    <Settings className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
                </div>
            </div>
        </div>
    );
}
