/**
 * MIDI-specific input mapper
 * Maps MIDI notes to game actions
 */


const LEFT_RANGE = [0, 11];
const RIGHT_RANGE = [12, 127];

class MidiMapper extends InputMapper {
  constructor() {
    super();
    this.midiInterface = new MidiInterface();
    
    // Define default mappings for directional controls
    this.mappings = {
      'Left': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, LEFT_RANGE[0], LEFT_RANGE[1])
          && !this.isNoteFlat(midiData)
      },
      'Right': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, RIGHT_RANGE[0], RIGHT_RANGE[1])
          && !this.isNoteFlat(midiData)
      },
      'Up': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, LEFT_RANGE[0], LEFT_RANGE[1])
          && this.isNoteFlat(midiData)
      },
      'Down': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, RIGHT_RANGE[0], RIGHT_RANGE[1])
          && this.isNoteFlat(midiData)
          
      },
      'Drop': {
        filter: (midiData) => 
         midiData.note === 40
      }
    };
    
    this.actions = Object.keys(this.mappings);
  }

  /**
   * Initialize the MIDI mapper
   */
  async initialize() {
    const initialized = await this.midiInterface.initialize();
    
    if (initialized) {
      this.midiInterface.setMessageCallback((midiData) => {
        // Process the MIDI data through our mappings
        for (const [action, mapping] of Object.entries(this.mappings)) {
          if (mapping.filter(midiData)) {
            this.handleInput(action, { midiData: midiData });
          }
        }
      });
    }
    
    return this;
  }

  /**
   * Check if a MIDI message is a note-on event
   * @param {Object} midiData - Processed MIDI data
   * @returns {boolean} - Whether it's a note-on event
   */
  isNoteOn(midiData) {
    return midiData.eventType === 9;
  }

  /**
   * Check if a MIDI message is a note-off event
   * @param {Object} midiData - Processed MIDI data
   * @returns {boolean} - Whether it's a note-off event
   */
  isNoteOff(midiData) {
    return midiData.eventType === 8 || (midiData.eventType === 9 && midiData.velocity === 0);
  }

  isNoteFlat(midiData) {
    let majorScale = [0, 2, 4, 5, 7, 9, 11];
    return !majorScale.includes(midiData.normalizedNote % 12);
  }

  /**
   * Check if a MIDI message is a control change event
   * @param {Object} midiData - Processed MIDI data
   * @returns {boolean} - Whether it's a control change event
   */
  isControlChange(midiData) {
    return midiData.eventType === 11;
  }

  /**
   * Check if a MIDI note is within a specific range
   * @param {Object} midiData - Processed MIDI data
   * @param {number} min - Minimum note value (inclusive)
   * @param {number} max - Maximum note value (inclusive)
   * @returns {boolean} - Whether the note is in range
   */
  isNoteInRange(midiData, min, max) {
    return midiData.normalizedNote >= min && midiData.normalizedNote <= max;
  }
}