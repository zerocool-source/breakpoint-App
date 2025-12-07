import { useState, useEffect, useRef } from "react";
import loadingVideo from "@assets/Lets_add_this_202512071522_1765149757829.mp4";
import logo from "@assets/Breakpoint Icon Sticker - Artwork.png";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showLogo, setShowLogo] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onLoadingComplete();
    };

    const handleError = () => {
      setTimeout(onLoadingComplete, 3000);
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    video.play().catch(() => {
      setTimeout(onLoadingComplete, 3000);
    });

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
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
        autoPlay
      >
        <source src={loadingVideo} type="video/mp4" />
      </video>
      
      {showLogo && (
        <div className="relative z-10 flex flex-col items-center animate-pulse">
          <img 
            src={logo} 
            alt="Breakpoint BI" 
            className="w-32 h-32 object-contain drop-shadow-2xl"
            data-testid="loading-logo"
          />
          <div className="mt-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </div>
  );
}
