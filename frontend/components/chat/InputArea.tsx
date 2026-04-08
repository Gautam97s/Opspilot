"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    Paperclip,
    Terminal,
    Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputAreaProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

export function InputArea({ onSendMessage, isLoading }: InputAreaProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    return (
        <div className="px-4 py-0.5 border-t border-white/10 bg-transparent">
            <div className="max-w-4xl mx-auto">
                <div
                    className={cn(
                        "relative flex items-center gap-1.5 rounded-2xl px-2 py-[3px]",
                        "bg-transparent border border-white/10 backdrop-blur-2xl",
                        "shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
                        "transition-all duration-300",
                        "focus-within:border-white/20 focus-within:shadow-[0_10px_36px_rgba(0,0,0,0.55)]"
                    )}
                >
                    <button className="flex shrink-0 items-center gap-1.5 px-2 py-[5px] text-xs font-medium text-white/75 bg-white/8 rounded-xl hover:bg-white/12 hover:text-white transition-colors border border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                        <Terminal className="w-3 h-3" />
                        <span>Bash</span>
                    </button>

                    <div className="flex-1 min-w-0">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe infrastructure task..."
                            className={cn(
                                "block w-full min-h-[32px] text-sm text-white/85 placeholder:text-white/35 resize-none focus:outline-none px-3 py-[7px] max-h-[104px] font-mono rounded-xl no-scrollbar leading-5",
                                "bg-white/8 border border-white/20",
                                "hover:bg-white/12",
                                "focus:border-white/30 focus:bg-white/12 transition-colors"
                            )}
                            rows={1}
                        />
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            className="flex h-[30px] w-[30px] items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition-colors"
                            title="Attach file"
                        >
                            <Paperclip className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            disabled={!input.trim() || isLoading}
                            className={cn(
                                "h-[30px] w-[30px] rounded-xl transition-all flex items-center justify-center",
                                input.trim() && !isLoading
                                    ? "bg-white text-black hover:scale-[1.03] shadow-[0_0_18px_rgba(255,255,255,0.18)]"
                                    : "bg-white/10 text-white/30 cursor-not-allowed"
                            )}
                        >
                            <Send className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[8px] text-white/25 px-1">
                    <div className="flex items-center gap-2">
                        <span><kbd className="font-sans bg-white/5 px-1 rounded border border-white/10">Enter</kbd> to send</span>
                        <span><kbd className="font-sans bg-white/5 px-1 rounded border border-white/10">Shift + Enter</kbd> for new line</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Command className="w-3 h-3" />
                        <span>AI Model: Gemini 2.5 Flash</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
