"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const TABS = ['AI Responses', 'Image', 'Video', 'Analytics', 'Live'];

export function HeroSection() {
    const [activeTab, setActiveTab] = useState('Image');

    return (
        <div className="flex flex-col items-center justify-center pt-[15vh] pb-10 relative z-10">
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-6xl md:text-7xl font-serif text-white/90 tracking-tight text-center mb-4"
            >
                Hello, Artem!
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                className="text-3xl md:text-4xl font-serif text-white/50 tracking-tight text-center mb-12"
            >
                What are you want today?
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="flex items-center gap-1 p-1"
            >
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "relative px-5 py-2 text-sm transition-all duration-300 rounded-full",
                            activeTab === tab ? "text-white" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-sm border border-white/5"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{tab}</span>
                    </button>
                ))}
            </motion.div>
        </div>
    );
}
