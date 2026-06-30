import { useState, useEffect } from "react";

export function useTypingEffect(text: string, startDelay: number, charDelay: number = 60) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Check for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    let interval: NodeJS.Timeout;

    const timeout = setTimeout(() => {
      setIsTyping(true);
      let currentIndex = 0;
      
      interval = setInterval(() => {
        if (currentIndex < text.length - 1) {
          setDisplayedText((prev) => prev + text[currentIndex]);
          currentIndex++;
        } else {
          setDisplayedText(text);
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
