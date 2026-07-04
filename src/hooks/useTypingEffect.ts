import { useState, useEffect } from "react";

export function useTypingEffect(text: string, startDelay: number, charDelay: number = 60) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Check for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setTimeout(() => {
        setDisplayedText(text);
        setIsTyping(false);
      }, 0);
      return;
    }

    let interval: NodeJS.Timeout;

    const timeout = setTimeout(() => {
      setIsTyping(true);
      let currentIndex = 0;
      
      interval = setInterval(() => {
        currentIndex++;
        setDisplayedText(text.slice(0, currentIndex));
        if (currentIndex >= text.length) {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, charDelay);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, startDelay, charDelay]);

  return { displayedText, isTyping };
}
