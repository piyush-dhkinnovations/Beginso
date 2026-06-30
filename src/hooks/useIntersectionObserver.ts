import { useEffect, useRef, useState } from "react";

export function useIntersectionObserver(options: IntersectionObserverInit = { threshold: 0.15 }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(element);
      }
    }, options);

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.threshold, options.root, options.rootMargin]); // Destructure options for dependencies

  return { ref, isVisible };
}
