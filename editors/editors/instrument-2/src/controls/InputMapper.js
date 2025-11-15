
/**
 * Base class for input mappers - converts device inputs to game actions
 * 
 * ## To extend:
 * 
 * 1. **Define mappings** - Set `this.mappings` with action → filter pairs
 *    Filter returns true when action should trigger
 * 
 * 2. **Implement initialize()** - Listen for input, check filters, 
 *    call `this.handleInput(action, data)` when matched
 * 
 * 3. **Actions auto-populate** from `Object.keys(this.mappings)`
 * 
 * ## Example:
 * 
 * ```javascript
 * class MyMapper extends InputMapper {
 *   constructor() {
 *     super();
 *     this.mappings = {
 *       'Jump': { filter: (data) => data.key === 'Space' },
 *       'Move': { filter: (data) => data.key === 'ArrowRight' }
 *     };
 *   }
 * 
 *   initialize() {
 *     window.addEventListener('keydown', (e) => {
 *       for (const [action, mapping] of Object.entries(this.mappings)) {
 *         if (mapping.filter({ key: e.code })) {
 *           this.handleInput(action, { key: e.code });
 *         }
 *       }
 *     });
 *     return this;
 *   }
 * }
 * ```
 * 
 * See MidiMapper.js for an example implementation.
*/
export class InputMapper {
  
  constructor() {
      this.executeAction = null;
      this.actions = [];
  }

  /**
   * Register an input mapper with the control manager
   * @param {ControlManager} controller - The controller to use
   * @returns {boolean} - Whether the controller was set successfully
   */
  setController(controller) {
    if (!controller || typeof controller.executeAction !== 'function') {
      console.error('Invalid controller: missing executeAction method');
      return false;
    }
    this.executeAction = controller.executeAction.bind(controller);
    return true;
  }

  getActions() {
    return this.actions.length > 0 
      ? this.actions 
      : (this.mappings ? Object.keys(this.mappings) : []);
  }

  handleInput(action, inputData = {}) {
    if (this.executeAction) {
      this.executeAction(action, inputData);
    } else {
      console.warn('No executeAction function provided');
    }
  }

  /**
   * Set up input listeners
   */
  initialize() {
      console.warn('InputMapper.initialize() must be implemented by subclass');
      return this;
  }
}
