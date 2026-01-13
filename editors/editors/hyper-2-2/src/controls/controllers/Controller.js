/**
 * Controllers define what actions a player can take in the game.
 * 
 * Think of a Controller as the list of things a player can do (move left, jump, shoot, etc.)
 * and what should happen when they do those things.
 * 
 * ## To override:
 * 
 * Extend Controller and call `declareActions()` to set up your player actions.
 * Pass it an object where keys are action names and values are the functions to run.
 * 
 * ## How Controllers work with Mappers:
 * 
 * Controllers work together with Mappers:
 * - **Mappers** translate physical inputs (keyboard keys, MIDI notes) into action names
 * - **Controllers** define what happens when those actions are triggered
 * 
 * Example flow: Player presses ArrowRight → Mapper says "Right" → Controller runs your _moveRight function
 * 
 * Communication: Mappers call `setController(controller)` to get access to this controller's 
 * `executeAction` method. When they detect an input, they call `executeAction(actionName, data)` 
 * which looks up and runs the corresponding handler function.
 * 
 * See FourDirectionController for a complete implementation.
 */
export class Controller {
  constructor(game) {
    this.game = game;
    // Map of player actions to handler functions
    // ie 'move up' -> moveUp()
    this.playerActions = new Map(); // string -> function
  }

  /**
   * Add a single action handler
   * @param {string} action - The action name to listen for
   * @param {Function} callback - The callback function that will be called with (data) where data is an object containing additional action data
   * @returns {Controller} - Returns this for method chaining
   */
  addAction(action, callback) {
    this.playerActions.set(action, callback);
    return this;
  }

  /**
   * Remove an action handler
   * @param {string} action - The action name
   * @returns {Controller} - Returns this for method chaining
   */
  removeAction(action) {
    this.playerActions.delete(action);
    return this;
  }

  /**
   * Declare multiple action handlers at once
   * @param {Object} actionMap - Object mapping action names to handler functions
   * @returns {Controller} - Returns this for method chaining
   */
  declareActions(actionMap) {
    for (const [action, handler] of Object.entries(actionMap)) {
      this.addAction(action, handler);
    }
    return this;
  }
  
  /**
   * Generate a summary of action mappings and warnings for unmapped actions
   * @param {Array} mappers - Array of input mappers to validate
   */
  summarizeActionMappings(mappers) {
    console.group('Control Action Mapping Summary');
    
    // Get all unique actions from input mappers
    const mappedActions = new Set();
    mappers.forEach(mapper => {
      console.log("mapper", mapper);
      Object.keys(mapper.mappings).forEach(action => {
        mappedActions.add(action);
      });
    });
    
    // Print the number of mapped actions
    console.log(`Actions mapped (${mappedActions.size}): ${[...mappedActions].join(', ')}`);
    
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
    // Validate action parameter
    if (!action || typeof action !== 'string') {
      console.error('Invalid action: must be a non-empty string');
      return false;
    }
    
    // Run the appropriate action if it exists
    if (this.playerActions.has(action)) {
      try {
        this.playerActions.get(action)(data);
        return true;
      } catch (error) {
        console.error(`Error executing action "${action}":`, error);
        return false;
      }
    } else {
      // Only log as debug since this might be expected in some cases
      if (this.playerActions.size > 0) {
        console.debug(`Action not found: "${action}". Available actions: ${[...this.playerActions.keys()].join(', ')}`);
      }
      return false;
    }
  }
}
