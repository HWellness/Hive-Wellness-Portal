import { useEffect, useState, ReactNode } from "react";

// Skip to main content link for keyboard navigation
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                 bg-hive-purple text-white px-4 py-2 rounded-md z-50 
                 focus:outline-none focus:ring-2 focus:ring-hive-purple"
    >
      Skip to main content
    </a>
  );
}

// Announce important changes to screen readers
export function LiveRegion({
  children,
  politeness = "polite",
}: {
  children: ReactNode;
  politeness?: "polite" | "assertive" | "off";
}) {
  return (
    <div aria-live={politeness} aria-atomic="true" className="sr-only">
      {children}
    </div>
  );
}

// Focus management hook
export function useFocusManagement() {
  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  };

  const trapFocus = (containerSelector: string) => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  };

  return { focusElement, trapFocus };
}

// High contrast mode detector
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: high)");
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isHighContrast;
}

// Reduced motion detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Keyboard navigation helper
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add visual focus indicators when using keyboard
      if (e.key === "Tab") {
        document.body.classList.add("keyboard-navigation");
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove("keyboard-navigation");
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);
}

// ARIA helpers
export const ariaHelpers = {
  // Generate unique IDs for form associations
  generateId: (prefix: string = "id") => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,

  // Common ARIA attributes for form validation
  getErrorAttributes: (hasError: boolean, errorId?: string) => ({
    "aria-invalid": hasError,
    "aria-describedby": hasError && errorId ? errorId : undefined,
  }),

  // Loading state attributes
  getLoadingAttributes: (isLoading: boolean) => ({
    "aria-busy": isLoading,
    "aria-live": "polite" as const,
  }),

  // Modal attributes
  getModalAttributes: (isOpen: boolean, labelledBy?: string) => ({
    role: "dialog" as const,
    "aria-modal": isOpen,
    "aria-labelledby": labelledBy,
  }),
};
