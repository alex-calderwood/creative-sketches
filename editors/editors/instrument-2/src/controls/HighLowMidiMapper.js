import { InputMapper } from './InputMapper.js';
import { MidiInterface } from './MIDI.js';

/**
 * MIDI-specific input mapper
 * Maps MIDI notes to game actions
 */

const LEFT_RANGE = [0, 11];
const RIGHT_RANGE = [12, 127];

export class HighLowMidiMapper extends InputMapper {
  static name = 'High/Low Ranges';
  static description = 'Maps specific note ranges to directions. Low range (natural notes) = left/up, high range (natural notes) = right/down.';
  static options = [
    { id: 'noteRange', label: 'Note Range', type: 'range', min: 0, max: 127, defaults: [0, 127] },
    { id: 'leftRange', label: 'Left Range', type: 'range', min: 0, max: 127, defaults: [0, 11] },
    { id: 'rightRange', label: 'Right Range', type: 'range', min: 0, max: 127, defaults: [12, 127] }
  ];

  constructor(options = {}) {
    super();
    this.midiInterface = new MidiInterface(true, options);
    
    // Use provided ranges or defaults
    const leftRange = options.leftRange || LEFT_RANGE;
    const rightRange = options.rightRange || RIGHT_RANGE;
    
    // Define default mappings for directional controls
    // Map from MIDI note numbers to game actions
    this.mappings = {
      'Left': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, leftRange[0], leftRange[1])
          && !this.isNoteFlat(midiData)
      },
      'Right': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, rightRange[0], rightRange[1])
          && !this.isNoteFlat(midiData)
      },
      'Up': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, leftRange[0], leftRange[1])
          && this.isNoteFlat(midiData)
      },
      'Down': {
        filter: (midiData) => 
          this.isNoteOn(midiData) && 
          this.isNoteInRange(midiData, rightRange[0], rightRange[1])
          && this.isNoteFlat(midiData)
          
      },
      'Drop': {
        filter: (midiData) => 
         midiData.note === 40 // kick pad
        // this.isNoteOn(midiData)

      }
    };
  }

  /**
   * Initialize the MIDI event listeners 
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