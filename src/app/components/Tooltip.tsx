"use client";

import React, { useState, ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ children, content, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-[100] ${positionClasses[position]} w-max max-w-xs animate-[fade-in_150ms_ease-out]`}>
          <div className="liquid-glass bg-black/90 backdrop-blur-md text-white text-[12px] font-sans rounded-xl py-1.5 px-3 shadow-lg pointer-events-none border border-white/10">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
