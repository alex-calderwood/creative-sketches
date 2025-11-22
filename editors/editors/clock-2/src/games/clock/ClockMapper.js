import { InputMapper } from '../../controls/mappers/InputMapper.js';

/**
* Keyboard-specific input mapper
*/
export class ClockMapper extends InputMapper {
  
    constructor(options = {}) {
        super();
        this.eventTarget = document;
        this.numHands = options.numHands;
        this.mappings = {
          'Drop': {
            filter: (event) => {
              let handNumber = parseInt(event.key) - 1;
              // set 0 -> 8 if num hands is 9
              if (handNumber === -1) { handNumber = this.numHands - 1; }
              return handNumber >= 0 && handNumber < this.numHands;
            }
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
