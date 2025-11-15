import { createModal } from './uiUtils.js';
import { FourDirectionControls, AutoDropFourDirectionControls } from '../controls/FieldGameControls.js';
import { KeyboardMapper } from '../controls/KeyboardMapper.js';
import { TrackingMidiMapper } from '../controls/TrackingMidiMapper.js';
import { HighLowMidiMapper } from '../controls/HighLowMidiMapper.js';

export class ControlSelect {
  constructor(game) {
    this.game = game;
    this.resolveConfigPromise = null;
    
    // Define available MIDI mappers - configuration comes from the classes themselves
    this.mapperTypes = {
      'tracking': TrackingMidiMapper,
      'highlow': HighLowMidiMapper
    };
  }

  /**
   * Shows the control configuration screen.
   * Brings up an HTML screen that allows user to configure controls.
   * @returns {void}
   */
  showControlSelect() {
    // Build mapper type options
    const mapperOptions = Object.entries(this.mapperTypes)
      .map(([id, MapperClass]) => `<option value="${id}">${MapperClass.name}</option>`)
      .join('');
    
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
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold;">
              MIDI Mapper Type
            </label>
            <select id="mapper-type-select" style="width: 100%; padding: 5px;">
              ${mapperOptions}
            </select>
            <p style="font-size: 0.85em; color: #666; margin: 5px 0 0 0;">
              Select the type of MIDI control mapping.
            </p>
          </div>
          <div id="mapper-options-container" style="margin-bottom: 20px;">
            <!-- Options will be dynamically inserted here -->
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel" class="control-btn">Cancel</button>
          <button id="select" class="control-btn">Start</button>
        </div>
      </div>
    `);
    
    // Add event listeners
    const mapperSelect = document.getElementById('mapper-type-select');
    mapperSelect.addEventListener('change', () => {
      this.renderMapperOptions(mapperSelect.value);
    });
    
    // Render initial options
    this.renderMapperOptions(mapperSelect.value);
    
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
   * Renders the options for the selected mapper type
   * @param {string} mapperTypeId - The ID of the selected mapper type
   */
  renderMapperOptions(mapperTypeId) {
    const MapperClass = this.mapperTypes[mapperTypeId];
    const container = document.getElementById('mapper-options-container');
    
    if (!MapperClass || !container) return;
    
    // Show description
    let html = '';
    if (MapperClass.description) {
      html += `
        <div style="margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <p style="margin: 0; font-size: 0.9em; color: #444;">
            ${MapperClass.description}
          </p>
        </div>
      `;
    }
    
    // Build HTML for each option
    const optionsHtml = MapperClass.options.map(option => {
      if (option.type === 'range') {
        return `
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold;">
              ${option.label}
            </label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div>
                <label for="${option.id}-min" style="font-size: 0.85em; color: #666;">Min:</label>
                <input type="number" id="${option.id}-min" value="${option.defaults[0]}" 
                       min="${option.min}" max="${option.max}" 
                       style="width: 60px; margin-left: 5px;">
              </div>
              <div>
                <label for="${option.id}-max" style="font-size: 0.85em; color: #666;">Max:</label>
                <input type="number" id="${option.id}-max" value="${option.defaults[1]}" 
                       min="${option.min}" max="${option.max}" 
                       style="width: 60px; margin-left: 5px;">
              </div>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');
    
    container.innerHTML = html + optionsHtml;
  }
  
  /**
   * Handles config selection and creates the controller objects
   * @returns {Object} Object containing controller, keyboardMapper, and midiMapper
   */
  onConfigSelected() {
    const autoDrop = document.getElementById('autodrop-checkbox').checked;
    const mapperTypeId = document.getElementById('mapper-type-select').value;
    const MapperClass = this.mapperTypes[mapperTypeId];
    
    // Create the controller based on autoDrop setting
    const controller = autoDrop 
      ? new AutoDropFourDirectionControls(this.game)
      : new FourDirectionControls(this.game);
    
    // Initialize keyboard controls
    const keyboardMapper = new KeyboardMapper().initialize();
    keyboardMapper.setController(controller);
    
    // Build options object from the UI inputs
    const mapperOptions = {};
    MapperClass.options.forEach(option => {
      if (option.type === 'range') {
        const minValue = parseInt(document.getElementById(`${option.id}-min`).value, 10);
        const maxValue = parseInt(document.getElementById(`${option.id}-max`).value, 10);
        mapperOptions[option.id] = [minValue, maxValue];
      }
    });
    
    // Initialize MIDI controls with the selected mapper type and options
    const midiMapper = new MapperClass(mapperOptions);
    
    // Initialize MIDI and set controller
    midiMapper.initialize().then(() => {
      midiMapper.setController(controller);
      console.log(`${MapperClass.name} initialized and connected to controller`);
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

