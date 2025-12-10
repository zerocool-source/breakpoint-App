import { useEffect, useRef } from "react";
import introVideo from "@assets/I_want_the_202512091837_1765334326048.mp4";

interface IntroVideoProps {
  onComplete: () => void;
}

export function IntroVideo({ onComplete }: IntroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      onComplete();
      return;
    }

    let videoStarted = false;

    const handleEnded = () => {
      onComplete();
    };

    const handleError = () => {
      onComplete();
    };

    const handleCanPlay = () => {
      video.play().catch(() => {
        onComplete();
      });
    };

    const handlePlay = () => {
      videoStarted = true;
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);

    const quickTimeout = setTimeout(() => {
      if (!videoStarted) {
        onComplete();
      }
    }, 3000);

    const maxTimeout = setTimeout(() => {
      onComplete();
    }, 60000);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      clearTimeout(quickTimeout);
      clearTimeout(maxTimeout);
    };
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center overflow-hidden"
      data-testid="intro-video"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
      >
        <source src={introVideo} type="video/mp4" />
      </video>
    </div>
  );
}
