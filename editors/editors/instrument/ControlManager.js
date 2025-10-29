/**
 * Central event manager for game controls using native EventTarget
 */
class ControlManager {
  constructor() {
    this.inputMappers = [];
    // Map of player actions to handler functions
    // ie 'move up' -> moveUp()
    this.playerActions = new Map(); // string -> function
  }

  /**
   * Register an input mapper with the control manager
   * @param {InputMapper} mapper - The input mapper to register
   * @returns {ControlManager} - Returns this for method chaining
   */
  registerMapper(mapper) {
    if (!this.inputMappers.includes(mapper)) {
      this.inputMappers.push(mapper);
      return this;
    }
    console.warn(`Mapper ${mapper.constructor.name} already registered`);
    return this;
  }

  /**
   * Add a single action handler
   * @param {string} action - The action name to listen for
   * @param {Function} callback - The callback function
   * @returns {ControlManager} - Returns this for method chaining
   */
  addAction(action, callback) {
    this.playerActions.set(action, callback);
    return this;
  }

  /**
   * Remove an action handler
   * @param {string} action - The action name
   * @returns {ControlManager} - Returns this for method chaining
   */
  removeAction(action) {
    this.playerActions.delete(action);
    return this;
  }

  /**
   * Declare multiple action handlers at once
   * @param {Object} actionMap - Object mapping action names to handler functions
   * @returns {ControlManager} - Returns this for method chaining
   */
  declareActions(actionMap) {
    for (const [action, handler] of Object.entries(actionMap)) {
      this.addAction(action, handler);
    }
    
    // Generate a summary of mapped actions
    this.summarizeActionMappings();
    
    return this;
  }
  
  /**
   * Generate a summary of action mappings and warnings for unmapped actions
   */
  summarizeActionMappings() {
    console.group('Control Action Mapping Summary');
    
    // Get all unique actions from input mappers
    const mappedActions = new Set();
    this.inputMappers.forEach(mapper => {
      Object.keys(mapper.mappings).forEach(action => {
        mappedActions.add(action);
      });
    });
    
    // Print the number of mapped actions
    console.log(`Actions mapped: ${mappedActions.size}`);
    
    // Find actions that are declared but not mapped to any input
    const unmappedActions = [...this.playerActions.keys()].filter(action => !mappedActions.has(action));
    if (unmappedActions.length > 0) {
      console.warn(`Unmapped actions: ${unmappedActions.join(', ')}`);
    }
    
    // Find actions that are mapped in inputs but not declared as handlers
    const undeclaredMappings = [...mappedActions].filter(action => !this.playerActions.has(action));
    if (undeclaredMappings.length > 0) {
      console.warn(`Warning: Inputs mapped to undeclared actions: ${undeclaredMappings.join(', ')}`);
    }
    
    console.groupEnd();
  }

  /**
   * Execute a game action event
   * @param {string} action - The action name
   * @param {Object} data - Additional data for the action
   * @returns {boolean} - Whether the action was executed
   */
  executeAction(action, data = {}) {
    // Run the appropriate action if it exists
    if (this.playerActions.has(action)) {
      this.playerActions.get(action)(data);
      return true;
    }
    return false;
  }
}

  
/**
 * Arrow-specific control manager for tetris-like games
 * Handles moveLeft, moveRight, moveUp, moveDown, and drop actions
 */
class ArrowControlManager extends ControlManager {
  constructor(game) {
    super();
    this.game = game;
  }

  initialize() {
    // Set up event listeners for game actions
    this.setupGameHandlers();
    return this;
  }

  setupGameHandlers() {
    // Use the new declareActions method to set up all handlers at once
    this.declareActions({
      'Left': this.onMoveLeft.bind(this),
      'Right': this.onMoveRight.bind(this),
      'Up': this.onMoveUp.bind(this),
      'Down': this.onMoveDown.bind(this),
      'Drop': this.onDrop.bind(this)
    });
  }

  /**
   * Handler for Left action
   * @param {Object} data - The input data
   */
  onMoveLeft(data) {
    // To be implemented
  }

  /**
   * Handler for Right action
   * @param {Object} data - The input data
   */
  onMoveRight(data) {
    // To be implemented
  }

  /**
   * Handler for Up action
   * @param {Object} data - The input data
   */
  onMoveUp(data) {
    // To be implemented
  }

  /**
   * Handler for Down action
   * @param {Object} data - The input data
   */
  onMoveDown(data) {
    // To be implemented
  }

  /**
   * Handler for Drop action
   * @param {Object} data - The input data
   */
  onDrop(data) {
    // To be implemented
  }
}

  // Export the classes
  export { ControlManager, ArrowControlManager };