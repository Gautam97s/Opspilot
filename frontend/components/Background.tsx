"use client";

import React from 'react';
import { motion } from 'framer-motion';

export function Background() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[#050505]">
            {/* Warm Glow Bottom Left */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[#ff4d00] blur-[180px] opacity-20"
            />

            {/* Secondary Cooler Glow Top Right (Subtle) */}
            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#1a1a2e] blur-[150px] opacity-40" />

            {/* Vertical Grain Overlay */}
            <div className="bg-grain" />

            {/* Subtle Vertical Lines/Grid for texture (Optional, based on 'vertical grain' description which might imply lines) */}
            <div className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(90deg, transparent 99%, #fff 100%)',
                    backgroundSize: '200px 100%'
                }}
            />
        </div>
    );
}
