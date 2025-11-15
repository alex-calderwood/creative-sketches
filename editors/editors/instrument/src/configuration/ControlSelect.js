import { createModal } from './uiUtils.js';
import { FourDirectionControls, AutoDropFourDirectionControls } from '../controls/FieldGameControls.js';
import { KeyboardMapper } from '../controls/KeyboardMapper.js';
import { MidiMapper } from '../controls/MidiMapper.js';

export class ControlSelect {
  constructor(game) {
    this.game = game;
    this.resolveConfigPromise = null;
  }

  /**
   * Shows the control configuration screen.
   * Brings up an HTML screen that allows user to configure controls.
   * @returns {void}
   */
  showControlSelect() {
    console.log("ControlSelect.showControlSelect()");
    
    // Default MIDI ranges from MidiMapper
    const defaultLeftMin = 0;
    const defaultLeftMax = 11;
    const defaultRightMin = 12;
    const defaultRightMax = 127;
    
    // Show an HTML modal
    const modal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Control Configuration</h3>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" id="autodrop-checkbox" checked>
              <span>Auto Drop</span>
            </label>
            <p style="font-size: 0.85em; color: #666; margin: 5px 0 0 26px;">
              Automatically place words when a direction / key is pressed.
            </p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <h4>MIDI Note Ranges</h4>
            <p style="font-size: 0.9em; color: #666;">
              Play with a MIDI keyboard to control block movement. Configure the note ranges below to map natural notes to left/right controls.
            </p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
            <div>
              <label>Left Range (Min)</label>
              <input type="number" id="left-min" value="${defaultLeftMin}" min="0" max="127" style="width: 100%;">
            </div>
            <div>
              <label>Left Range (Max)</label>
              <input type="number" id="left-max" value="${defaultLeftMax}" min="0" max="127" style="width: 100%;">
            </div>
            <div>
              <label>Right Range (Min)</label>
              <input type="number" id="right-min" value="${defaultRightMin}" min="0" max="127" style="width: 100%;">
            </div>
            <div>
              <label>Right Range (Max)</label>
              <input type="number" id="right-max" value="${defaultRightMax}" min="0" max="127" style="width: 100%;">
            </div>
          </div>
          
          <p style="font-size: 0.85em; color: #888; margin-top: 10px;">
            Note: Up uses left range with flat notes, Down uses right range with flat notes
          </p>
        </div>
        <div class="modal-footer">
          <button id="cancel" class="control-btn">Cancel</button>
          <button id="select" class="control-btn">Start</button>
        </div>
      </div>
    `);
    
    // Add event listeners
    document.getElementById('select').addEventListener('click', () => {
      this.onConfigSelected();
      modal.remove();
    });
    
    document.getElementById('cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    return modal;
  }
  
  /**
   * Handles config selection and creates the controller objects
   * @returns {Object} Object containing controller, keyboardMapper, and midiMapper
   */
  onConfigSelected() {
    const autoDrop = document.getElementById('autodrop-checkbox').checked;
    const leftMin = parseInt(document.getElementById('left-min').value);
    const leftMax = parseInt(document.getElementById('left-max').value);
    const rightMin = parseInt(document.getElementById('right-min').value);
    const rightMax = parseInt(document.getElementById('right-max').value);
    
    // Create the controller based on autoDrop setting
    const controller = autoDrop 
      ? new AutoDropFourDirectionControls(this.game)
      : new FourDirectionControls(this.game);
    
    // Initialize keyboard controls
    const keyboardMapper = new KeyboardMapper().initialize();
    keyboardMapper.setController(controller);
    
    // Initialize MIDI controls with custom ranges
    const midiMapper = new MidiMapper({
      leftRange: [leftMin, leftMax],
      rightRange: [rightMin, rightMax]
    });
    
    // Initialize MIDI and set controller
    midiMapper.initialize().then(() => {
      midiMapper.setController(controller);
      console.log('MIDI mapper initialized with custom ranges and connected to controller');
    });
    
    const controls = {
      controller,
      keyboardMapper,
      midiMapper
    };
    
    if (this.resolveConfigPromise) {
      this.resolveConfigPromise(controls);
    }
    
    return controls;
  }

  /**
   * Gets control objects asynchronously after user selection
   * @returns {Promise<Object>} A promise that resolves to { controller, keyboardMapper, midiMapper }
   */
  getControls() {
    return new Promise((resolve) => {
      this.resolveConfigPromise = resolve;
      this.showControlSelect();
    });
  }
}

