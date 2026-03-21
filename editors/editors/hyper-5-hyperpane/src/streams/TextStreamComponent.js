import eventBus from '../EventBus.js';

/**
 * TextStreamComponent is the visual component for a stream of tokens.
 * 
 * This is where all visual logic should go - rendering tokens to the DOM, updating their
 * appearance, animations, etc. It has no knowledge of how tokens are generated or stored,
 * only how to display them.
 * 
 * ## To override:
 * 
 * Implement the required methods:
 * - `render()` - render all tokens
 * - `initialize(tokens)` - set up initial visual state with token array
 * - `onChange(index, event)` - update display when a token changes
 * - `onPush(event)` - update display when a token is added
 * - `onPop(event)` - update display when a token is removed
 * 
 * ## Communication:
 * 
 * TextStreamComponent listens for events from TextStream via EventBus and responds with
 * visual updates. When TextStream data changes, it emits events; TextStreamComponent
 * catches them and updates what the user sees.
 * 
 * See ClassicDomTextStreamComponent for a complete implementation.
 */
export class TextStreamComponent {
  constructor(game) {
    this.game = game;
    this.setupListeners();
  }
  
  /**
   * Set up event listeners for this component
   */
  setupListeners() {
    // Listen for token change events
    eventBus.on('token-change', (data) => {
      // Only handle events from our stream
      if (data.stream.id === this.streamId) {
        this.onChange(data.index, data);
      }
    });
    
    // Listen for stream shift events
    eventBus.on('stream-push', (data) => {
      // Only handle events from our stream
      if (data.stream.id === this.streamId) {
        this.onPush(data);
      }
    });

    // Listen for stream pop events
    eventBus.on('stream-pop', (data) => {
      // Only handle events from our stream
      if (data.stream.id === this.streamId) {
        this.onPop(data);
      }
    });
  }
  
  /**
   * Render all tokens
   */
  render() {
    throw new Error("render() not implemented");
  }
  
  /**
   * Handle token change events
   */
  onChange(index, event) {
    throw new Error("onChange() not implemented");
  }
  
  /**
   * Handle new token
   */
  onPush(event) {
    throw new Error("onPush() not implemented");
  }

  /**
   * Handle stream pop events
   */
  onPop(event) {
    throw new Error("onPop() not implemented");
  }

  /**
   * Initialize component with an array of tokens
   * @param {Array} tokens - Array of tokens to initialize with
   */
  initialize(tokens) {
    throw new Error("initialize() not implemented");
  }

  /**
   * Empty the component (reset its state)
   */
  empty() {
    // don't do anything by default
  }
  
}
