
/**
 * Abstract base class for input mappers
 * Converts device-specific inputs to game actions
*/
class InputMapper {
  /**
   * Create a new input mapper
   * @param {ControlManager} controlManager - The control manager to use
   */
  constructor(controlManager) {
      this.controlManager = controlManager;
      this.actions = [];
  }

  getActions() {
    return this.actions;
  }

  handleInput(action, inputData = {}) {
    this.controlManager.executeAction(action, inputData);
  }

  /**
   * Set up input listeners
   */
  initialize() {
      console.warn('InputMapper.initialize() must be implemented by subclass');
      return this;
  }
}

/**
* Keyboard-specific input mapper
*/
class KeyboardMapper extends InputMapper {
  /**
   * Create a new keyboard mapper
   * @param {ControlManager} controlManager - The control manager to use
   */
  constructor(controlManager) {
      super(controlManager);
      this.eventTarget = document;
      this.mappings = {
        'Right': {
          filter: (event) => event.key === 'ArrowRight'
        },
        'Left': {
          filter: (event) => event.key === 'ArrowLeft'
        },
        'Down': {
          filter: (event) => event.key === 'ArrowDown'
        },
        'Up': {
          filter: (event) => event.key === 'ArrowUp'
        },
        'Drop': {
          filter: (event) => event.key === ' ' || event.key === 'Space'
        }
      };
      this.actions = Object.keys(this.mappings);
  }

  /**
   * Set up keyboard event listeners
   */
  initialize() {
    document.addEventListener('keydown', (event) => {
      for (const [action, mapping] of Object.entries(this.mappings)) {
        if (mapping.filter(event)) {
          this.handleInput(action, { event: event });
        }
      }
    });
    
    return this;
  }
}

export { InputMapper, KeyboardMapper };