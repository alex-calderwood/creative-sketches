import { InputMapper } from './InputMapper.js';

/**
* Keyboard-specific input mapper
*/
export class FourDirectionKeyboardMapper extends InputMapper {
  
    constructor() {
        super();
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
          },
          'ChangeTense': {
            filter: (event) => event.key === '1'
          },
          'ChangeInflection': {
            filter: (event) => event.key === '2'
          },
          'Next': {
            filter: (event) => event.key === 'Enter'
          },
          'Delete': {
            filter: (event) => event.key === 'Backspace'
          },
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
