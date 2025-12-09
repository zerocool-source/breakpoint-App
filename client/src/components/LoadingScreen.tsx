import { useEffect, useRef, useState } from "react";
import loadingVideo from "@assets/Lets_add_this_202512071522_1765149757829.mp4";
import logo from "@assets/Breakpoint Icon Sticker - Artwork.png";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      onLoadingComplete();
      return;
    }

    let videoStarted = false;

    const handleEnded = () => {
      setProgress(100);
      setTimeout(onLoadingComplete, 300);
    };

    const handleError = () => {
      onLoadingComplete();
    };

    const handleCanPlay = () => {
      video.play().catch(() => {
        onLoadingComplete();
      });
    };

    const handlePlay = () => {
      videoStarted = true;
    };

    const handleTimeUpdate = () => {
      if (video.duration) {
        const percent = Math.round((video.currentTime / video.duration) * 100);
        setProgress(percent);
      }
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("timeupdate", handleTimeUpdate);

    // If video doesn't start within 3 seconds, skip loading screen
    const quickTimeout = setTimeout(() => {
      if (!videoStarted) {
        onLoadingComplete();
      }
    }, 3000);

    // Maximum timeout of 30 seconds
    const maxTimeout = setTimeout(() => {
      onLoadingComplete();
    }, 30000);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      clearTimeout(quickTimeout);
      clearTimeout(maxTimeout);
    };
  }, [onLoadingComplete]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
      data-testid="loading-screen"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
      >
        <source src={loadingVideo} type="video/mp4" />
      </video>

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2" data-testid="loading-indicator">
        <div className="relative">
          <img 
            src={logo} 
            alt="Loading" 
            className="w-6 h-6 object-contain animate-spin"
            style={{ animationDuration: '2s' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/70 text-[10px] font-ui tracking-wider">LOADING</span>
          <span className="text-primary text-sm font-bold font-ui">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
