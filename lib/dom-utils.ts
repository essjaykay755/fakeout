/**
 * Utility functions for safely interacting with the DOM
 */

/**
 * Safely adds an event listener to an element
 * @param selector CSS selector or Element object
 * @param event Event name
 * @param callback Event handler function
 * @param options Event listener options
 * @returns The element if found and listener attached, null otherwise
 */
export function safeAddEventListener(
  selector: string | Element | null,
  event: string,
  callback: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): Element | null {
  // If selector is a string, query the DOM
  const element =
    typeof selector === "string" ? document.querySelector(selector) : selector;

  // Only add event listener if element exists
  if (element) {
    element.addEventListener(event, callback, options);
    return element;
  }

  console.warn(
    `Tried to add ${event} listener to non-existent element: ${
      typeof selector === "string" ? selector : "Element"
    }`
  );
  return null;
}

/**
 * Safely removes an event listener from an element
 */
export function safeRemoveEventListener(
  selector: string | Element | null,
  event: string,
  callback: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions
): Element | null {
  const element =
    typeof selector === "string" ? document.querySelector(selector) : selector;

  if (element) {
    element.removeEventListener(event, callback, options);
    return element;
  }

  return null;
}
