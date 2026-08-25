"use client";

import { useEffect, useRef } from "react";

export const useHLS = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const initHLS = async () => {
      try {
        const HLS = (await import("hls.js")).default;

        if (HLS.isSupported()) {
          const hls = new HLS();
          hlsRef.current = hls;
        }
      } catch (error) {
        console.error("HLS.js failed to load:", error);
      }
    };

    initHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  const loadStream = (url: string) => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.loadSource(url);
    } else if (video.canPlayType && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    }
  };

  return { videoRef, loadStream };
};