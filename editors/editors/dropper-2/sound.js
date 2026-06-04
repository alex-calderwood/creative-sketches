class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
  }

  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Sound system initialized');
    } catch (error) {
      console.error('Error initializing sound system:', error);
    }
  }

  async loadSound(soundName) {
    if (this.sounds[soundName]) {
      return; // Already loaded
    }

    try {
      const assetsFolder = window.BASE_PATH + '/assets';
      const filePath = `${assetsFolder}/${soundName}.wav`;
      console.log('Loading sound from:', filePath);
      
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds[soundName] = audioBuffer;
      console.log('Sound loaded:', soundName);
    } catch (error) {
      console.error('Error loading sound:', soundName, error);
    }
  }

  async playSound(soundName) {
    if (!this.audioContext) {
      console.warn('Audio context not initialized');
      return;
    }

    // Load sound if not already loaded
    if (!this.sounds[soundName]) {
      await this.loadSound(soundName);
    }

    if (!this.sounds[soundName]) {
      console.warn('Sound not available:', soundName);
      return;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = this.sounds[soundName];
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set volume
    gainNode.gain.value = 0.3;
    
    source.start();
  }
}

// Create global sound manager instance
const soundManager = new SoundManager();