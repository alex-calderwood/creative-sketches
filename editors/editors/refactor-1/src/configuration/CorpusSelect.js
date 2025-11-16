import { ReaderSelect } from './ReaderSelect.js';
import { WikiSelect } from './WikiSelect.js';
import { CustomTextSelect } from './CustomTextSelect.js';
import { createModal } from './uiUtils.js';

/**
 * CorpusSelect shows all corpus options in a unified modal
 * Composes WikiSelect and CustomTextSelect sections together
 */
export class CorpusSelect extends ReaderSelect {
  constructor() {
    super();
    this.wikiSelect = new WikiSelect();
    this.customTextSelect = new CustomTextSelect();
  }

  /**
   * Shows a unified selection screen with all corpus options
   * @returns {void}
   */
  async showReaderSelect() {
    console.log("CorpusSelect.showReaderSelect()");
    
    // Show modal with all options composed from individual selectors
    const modal = createModal(`
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h3>Select a Reader</h3>
          <p style="margin: 8px 0 0 0; font-size: 0.9em; font-weight: normal; color: #666;">Choose from the following corpora</p>
        </div>
        <div class="modal-body" style="display: flex; gap: 20px; padding: 20px;">
          <!-- Wikipedia Section -->
          <div style="
            flex: 1; 
            padding: 20px; 
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            position: relative;
          ">
            <h4 style="margin: 0 0 15px 0; font-size: 1.3em; color: #333;">🌐 Wikipedia</h4>
            ${this.wikiSelect.getSectionHTML()}
          </div>
          
          <!-- Custom Text Section -->
          <div style="
            flex: 1; 
            padding: 20px; 
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            position: relative;
          ">
            <h4 style="margin: 0 0 15px 0; font-size: 1.3em; color: #333;">📝 Custom Text</h4>
            ${this.customTextSelect.getSectionHTML()}
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel" class="control-btn">Cancel</button>
        </div>
      </div>
    `);
    
    // Set up both sections with callbacks
    const onSelect = (reader) => this.onReaderSelected(reader);
    const removeModal = () => modal.remove();
    
    this.wikiSelect.setupSection(onSelect, removeModal);
    this.customTextSelect.setupSection(onSelect, removeModal);
    
    document.getElementById('cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    return modal;
  }
  
  onReaderSelected(reader) {
    super.onReaderSelected(reader);
    return reader;
  }
}

