"use client";

import React from 'react';
import { Background } from '@/components/Background';
import { BottomBar } from '@/components/BottomBar';
// Temporarily commenting out missing components to allow build
// import { TopBar } from '@/components/TopBar';
// import { HeroSection } from '@/components/HeroSection';
// import { InputCard } from '@/components/InputCard';

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden selection:bg-[#ff4d00]/30 selection:text-white">
      <Background />

      <div className="relative z-10 w-full h-full flex flex-col">
        {/* <TopBar /> */}

        <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
          {/* <HeroSection /> */}
          {/* <InputCard /> */}
          <div className="text-white text-center">
            <h1 className="text-5xl font-bold mb-4">Hello, Artem!</h1>
            <p className="text-xl text-white/60">What are you want today?</p>
            <p className="mt-8 text-white/40">(Waiting for TopBar, HeroSection, and InputCard components...)</p>
          </div>
        </main>

        <BottomBar />
      </div>
    </div>
  );
}
