"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomBar() {
    const [multiModel, setMultiModel] = useState(false);

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 px-8 py-6 flex items-center justify-between">
            {/* Left: Multi Model Toggle */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <button
                        onClick={() => setMultiModel(!multiModel)}
                        className={cn(
                            "w-9 h-5 rounded-full relative transition-colors duration-300",
                            multiModel ? "bg-white" : "bg-white/20"
                        )}
                    >
                        <motion.div
                            animate={{ x: multiModel ? 18 : 2 }}
                            className={cn(
                                "absolute top-1 w-3 h-3 rounded-full shadow-sm transition-colors",
                                multiModel ? "bg-black" : "bg-white"
                            )}
                        />
                    </button>
                    <span className="text-xs text-white/70 font-medium">Enable Multi model responses</span>
                </div>
            </div>

            {/* Center: Model Icons (Optional visual from reference) */}
            <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-2">
                {/* Placeholder for model icons if needed, or keep empty to match clean look */}
            </div>

            {/* Right: Disclaimer & Credits */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] border border-[#050505]">G</div>
                        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] border border-[#050505]">C</div>
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] border border-[#050505] text-white">+</div>
                    </div>
                    <span className="text-xs text-white/70 pl-1">3+</span>
                    <ChevronRight className="w-3 h-3 text-white/40" />
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                    <span>AI can make mistakes</span>
                    <Info className="w-3 h-3" />
                </div>
            </div>

            {/* Copyright (Absolute Bottom Left) */}
            <div className="absolute bottom-6 left-8 text-[10px] text-white/20 font-medium tracking-wider">
                Mayak AI © 2025
            </div>
        </footer>
    );
}
