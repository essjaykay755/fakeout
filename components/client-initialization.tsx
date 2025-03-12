"use client";

import { useEffect } from "react";

/**
 * This component handles client-side initialization and
 * guards against common DOM errors that might come from
 * third-party scripts or browser extensions.
 */
export function ClientInitialization() {
  useEffect(() => {
    // Safely handle potential errors from third-party scripts
    const originalAddEventListener = Element.prototype.addEventListener;

    // Override addEventListener to catch errors when element is null
    Element.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      try {
        return originalAddEventListener.call(this, type, listener, options);
      } catch (error) {
        console.warn(`Error adding event listener: ${error}`);
        return false;
      }
    };

    // Cleanup function to restore original method
    return () => {
      Element.prototype.addEventListener = originalAddEventListener;
    };
  }, []);

  // This component doesn't render anything
  return null;
}
