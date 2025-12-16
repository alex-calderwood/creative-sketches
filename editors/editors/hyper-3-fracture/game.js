import { FragmentPerformance } from './src/performances/fragment/FragmentPerformance.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.params = {
      overlayCount: 3,
      baseVelocity: 0.1,
      cornerPauseMs: 3000,
      fontSize: 16,
      fontFamily: 'SquareAntiqua'
    };
  }

  async initialize(options = {}) {
    this.performance = new FragmentPerformance(this.params);
    this.performance.initialize();
    
    this.setupOptionsModal();
  }

  setupOptionsModal() {
    const optionsBtn = document.getElementById('options-btn');
    const modal = document.getElementById('options-modal');
    const closeBtn = document.getElementById('options-close-btn');
    const applyBtn = document.getElementById('options-apply-btn');
    
    const overlayCountInput = document.getElementById('overlay-count');
    const baseVelocityInput = document.getElementById('base-velocity');
    const cornerPauseInput = document.getElementById('corner-pause');
    const fontSizeInput = document.getElementById('font-size');
    const fontFamilySelect = document.getElementById('font-family');
    
    // Open modal
    optionsBtn.addEventListener('click', () => {
      overlayCountInput.value = this.params.overlayCount;
      baseVelocityInput.value = this.params.baseVelocity;
      cornerPauseInput.value = this.params.cornerPauseMs / 1000;
      fontSizeInput.value = this.params.fontSize;
      fontFamilySelect.value = this.params.fontFamily;
      modal.style.display = 'flex';
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
    
    // Apply changes
    applyBtn.addEventListener('click', () => {
      this.params.overlayCount = parseInt(overlayCountInput.value) || 3;
      this.params.baseVelocity = parseFloat(baseVelocityInput.value) || 0.1;
      this.params.cornerPauseMs = (parseFloat(cornerPauseInput.value) || 3) * 1000;
      this.params.fontSize = parseInt(fontSizeInput.value) || 16;
      this.params.fontFamily = fontFamilySelect.value;
      
      if (this.performance) this.performance.stopAnimation();
      this.performance = new FragmentPerformance(this.params);
      this.performance.initialize();
      modal.style.display = 'none';
    });
  }
}