
/**
 * Mappers translate physical inputs into action names.
 * 
 * A Mapper listens for inputs from a device (keyboard, MIDI controller, etc.) and converts
 * them into simple action names like "Left" or "Jump". This lets you swap input devices
 * without changing game logic.
 * 
 * ## How Mappers work with Controllers:
 * 
 * - **Mappers** turn physical inputs into action names (ArrowRight → "Right")
 * - **Controllers** define what those actions actually do ("Right" → move player right)
 * 
 * Flow: Input Device → Mapper → Controller → Game
 * 
 * ## To override:
 * 
 * 1. Set `this.mappings` - an object where each key is an action name and each value
 *    has a `filter` function that returns true when that action should trigger
 * 
 * 2. Implement `initialize()` - set up listeners for your input device. When an input
 *    matches a filter, call `this.handleInput(actionName, data)`
 * 
 * See FourDirectionKeyboardMapper for a complete implementation.
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
