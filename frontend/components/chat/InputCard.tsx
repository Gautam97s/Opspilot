"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Paperclip,
    Mic,
    ArrowRight,
    Plus,
    SlidersHorizontal,
    ChevronDown,
    FileText,
    Image as ImageIcon,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function InputCard() {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="w-full max-w-2xl mx-auto relative z-20 "
        >
            {/* Glass Container */}
            <div className={cn(
                "relative overflow-hidden rounded-[32px] bg-[#0f0f11]/80 backdrop-blur-2xl border border-white/10 transition-all duration-500",
                isFocused ? "shadow-[0_0_40px_rgba(0,0,0,0.5)] border-white/20" : "shadow-2xl"
            )}>

                {/* Attachments Area */}
                <div className="px-6 pt-6 pb-2 flex gap-3 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 min-w-[180px] group cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white/90 truncate">Main References</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wide">PDF • 2.4 MB</p>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                            <X className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 min-w-[180px] group cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-white/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white/90 truncate">Last works</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wide">PNG • 12.6 MB</p>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-4 pb-4">
                    <div className="relative bg-black/20 rounded-[24px] border border-white/5 p-1 transition-all duration-300 focus-within:bg-black/40 focus-within:border-white/10">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Generate image (poster) for everyday design challenge"
                            className="w-full bg-transparent text-white/90 placeholder:text-white/30 px-4 py-4 text-sm focus:outline-none"
                        />

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button className="p-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/5">
                                <Mic className="w-4 h-4" />
                            </button>
                            <button className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between mt-3 px-2">
                        <div className="flex items-center gap-2">
                            <button className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>Add files</span>
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Tools</span>
                            </button>
                        </div>

                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                            <span>Gemini Flash 2.5</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
