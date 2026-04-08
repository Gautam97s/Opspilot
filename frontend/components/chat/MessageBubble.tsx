"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import {
    Terminal,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Play,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status?: 'streaming' | 'completed' | 'error';
    executionPlan?: {
        title: string;
        steps: { label: string; status: 'pending' | 'running' | 'completed' | 'failed' }[];
    };
    generatedCommand?: {
        language: string;
        code: string;
    };
}

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);
    const [planExpanded, setPlanExpanded] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const timestampText = useMemo(() => {
        if (!mounted) return "";
        // Avoid locale/timezone differences between server and client renders.
        // Show HH:MM from ISO time (UTC-based) for deterministic display.
        try {
            return message.timestamp.toISOString().slice(11, 16);
        } catch {
            return "";
        }
    }, [mounted, message.timestamp]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full mb-6",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "max-w-[85%] rounded-lg overflow-hidden",
                isUser ? "bg-blue-600/10 border border-blue-500/20 text-blue-100" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
            )}>
                {/* Header for Assistant Messages */}
                {!isUser && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950/50 border-b border-zinc-800/50">
                        <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Terminal className="w-3 h-3 text-indigo-400" />
                        </div>
                        <span className="text-xs font-medium text-zinc-400">DevOps Assistant</span>
                        <span className="text-[10px] text-zinc-600 ml-auto font-mono" suppressHydrationWarning>
                            {timestampText}
                        </span>
                    </div>
                )}

                <div className="p-4 text-sm leading-relaxed space-y-4">
                    {/* Main Text Content */}
                    <div className="markdown-body">
                        <ReactMarkdown
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <div className="relative group my-4 rounded-md overflow-hidden border border-zinc-800">
                                            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCopy(String(children).replace(/\n$/, ''))}
                                                    className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:text-white hover:bg-zinc-700 transition-colors"
                                                >
                                                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-500 font-mono flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50"></span>
                                                <span className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-500/50"></span>
                                                <span className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50"></span>
                                                <span className="ml-2 uppercase">{match[1]}</span>
                                            </div>
                                            <SyntaxHighlighter
                                                {...props}
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                customStyle={{ margin: 0, borderRadius: 0, background: '#09090b', fontSize: '13px' }}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        </div>
                                    ) : (
                                        <code {...props} className={cn("bg-zinc-800/50 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-xs", className)}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    {/* Execution Plan (Collapsible) */}
                    {message.executionPlan && (
                        <div className="mt-4 border border-zinc-800 rounded-md overflow-hidden bg-zinc-950/30">
                            <button
                                onClick={() => setPlanExpanded(!planExpanded)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/50 hover:bg-zinc-900 transition-colors border-b border-zinc-800/50"
                            >
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                                    <Play className="w-3 h-3 text-blue-500" />
                                    {message.executionPlan.title}
                                </div>
                                {planExpanded ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronRight className="w-3 h-3 text-zinc-600" />}
                            </button>

                            {planExpanded && (
                                <div className="p-3 space-y-2">
                                    {message.executionPlan.steps.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-xs">
                                            {step.status === 'completed' && <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"><Check className="w-2.5 h-2.5 text-emerald-500" /></div>}
                                            {step.status === 'running' && <div className="w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center border border-emerald-500/20"><Loader2 className="w-2.5 h-2.5 text-blue-500 animate-spin" /></div>}
                                            {step.status === 'pending' && <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700"><div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div></div>}
                                            {step.status === 'failed' && <div className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20"><AlertCircle className="w-2.5 h-2.5 text-red-500" /></div>}

                                            <span className={cn(
                                                "font-mono",
                                                step.status === 'completed' ? "text-zinc-400 line-through opacity-70" :
                                                    step.status === 'running' ? "text-blue-400" :
                                                        step.status === 'failed' ? "text-red-400" :
                                                            "text-zinc-500"
                                            )}>
                                                {step.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
