import { useEffect, useRef } from "react";
import loadingVideo from "@assets/Lets_add_this_202512071522_1765149757829.mp4";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onLoadingComplete();
    };

    const handleError = () => {
      onLoadingComplete();
    };

    const handleCanPlay = () => {
      video.play().catch(() => {
        onLoadingComplete();
      });
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);

    const maxTimeout = setTimeout(() => {
      onLoadingComplete();
    }, 15000);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", handleCanPlay);
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
    </div>
  );
}
