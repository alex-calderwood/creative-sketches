
/**
 * Abstract base class for input mappers
 * Converts device-specific inputs to game actions
*/
class InputMapper {
  
  constructor() {
      this.executeAction = null;
      this.actions = [];
  }

  /**
   * Register an input mapper with the control manager
   * @param {ControlManager} controller - The controller to use
   */
  setController(controller) {
    this.executeAction = controller.executeAction.bind(controller);
  }

  getActions() {
    return this.actions;
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
