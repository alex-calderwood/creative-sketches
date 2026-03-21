/**
 * EventBus is a singleton class that manages events for the game.
 * It uses the eventTarget to dispatch and listen for events.
 * The eventTarget can be set to any DOM element or custom event target.
 * @param {EventTarget} eventTarget - The event target to dispatch and listen for events.
 */
class EventBus {
  constructor(eventTarget = document) {
    this.eventTarget = eventTarget;
    this.verbose = false;
  }
  
  on(eventName, callback) {
    this.eventTarget.addEventListener(eventName, (e) => {
      if (this.verbose) {
        console.log(`EventBus: ${eventName} received`);
      }
      callback(e.detail); // Call the provided callback with the event detail
    });
    return () => this.off(eventName, callback);
  }
  
  off(eventName, callback) {
    this.eventTarget.removeEventListener(eventName, callback);
  }
  
  emit(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    this.eventTarget.dispatchEvent(event);
  }
  
  // Singleton pattern
  static instance = null;
  
  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

// Export the singleton instance directly
const eventBus = EventBus.getInstance();

export { EventBus };
export default eventBus;