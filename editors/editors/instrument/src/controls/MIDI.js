export class ScoreTracker {
    constructor() {
        this.bufferSize = 1000;
        // length limited, in order
        this.notes = []
    }

    addNote(note) {
        if (this.notes.length >= this.bufferSize) {
            this.notes.shift();
        }
        this.notes.push(note);
    }

    head(n=1) {
        return this.notes.slice(0, n);
    }

    getNotes() {
        return this.notes;
    }
}

const MIDI_SETTINGS = {
    'guitar': {
        noteRange: [40, 89],
    },
    'keyboard': {
        noteRange: [48, 72],
    }
}

/**
| * MIDI interface for handling different MIDI input sources
| */
export class MidiInterface {
    constructor(play = true) {
      this.midiAccess = null;
      this.onMidiMessage = null;
      this.initialized = false;
      this.verbosity = {
        showNote: true,
      }
      this.scoreTracker = new ScoreTracker();

      this.mode = 'keyboard';
      this.settings = MIDI_SETTINGS[this.mode];

      this.player = play ? new MIDIPlayer() : null;
    }
  
    /**
     * Initialize MIDI access
     * @returns {Promise} - Resolves when MIDI is initialized
     */
    async initialize() {
      if (navigator.requestMIDIAccess) {
        try {
          this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
          this.setupMidiInputs();
          this.initialized = true;
          console.log('MIDI interface initialized successfully');
          return true;
        } catch (error) {
          console.error('Failed to initialize MIDI:', error);
          return false;
        }
      } else {
        console.warn("WebMIDI is not supported in this browser.");
        return false;
      }
    }
  
    /**
     * Set up MIDI input listeners
     */
    setupMidiInputs() {
      const inputs = this.midiAccess.inputs.values();
      for (let input of inputs) {
        input.onmidimessage = this.handleMidiMessage.bind(this);
        console.log(`MIDI input connected: ${input.name}`);
      }
  
      // Listen for connection/disconnection events
      this.midiAccess.onstatechange = (event) => {
        if (event.port.type === 'input') {
          if (event.port.state === 'connected') {
            console.log(`MIDI input connected: ${event.port.name}`);
            event.port.onmidimessage = this.handleMidiMessage.bind(this);
          } else if (event.port.state === 'disconnected') {
            console.log(`MIDI input disconnected: ${event.port.name}`);
          }
        }
      };
    }
  
    /**
     * Process incoming MIDI messages
     * @param {MIDIMessageEvent} message - The MIDI message event
     */
    handleMidiMessage(message) {
      if (this.onMidiMessage) {
        // Pass the processed message to the callback
        this.onMidiMessage(this.processMidiMessage(message));
      }
    }
  
    /**
     * Process a MIDI message into a standardized format
     * @param {MIDIMessageEvent} message - The MIDI message event
     * @returns {Object} - Processed MIDI data
     */
    processMidiMessage(message) {
      const data = message.data;
      const channelNumber = (data[0] & 0x0F) + 1; // 1-indexed channel number (MIDI spec)
      const eventType = data[0] >> 4;
      const note = data[1] || 0;
      const velocity = data.length > 2 ? data[2] : 0;
      const source = message.source ? message.source.name : 'midi';
      

      // Create the basic MIDI data object
      const midiData = {
        raw: message,
        channel: channelNumber,
        eventType: eventType,
        note: note,
        velocity: velocity,
        source: source,
        timestamp: message.timeStamp
      };
      
      // Add normalized note value directly during processing
      midiData.normalizedNote = note - this.settings.noteRange[0];

      if (this.verbosity.showNote) {
        console.log(`MIDI note: ${midiData.normalizedNote} - ${note} on channel ${channelNumber} with velocity ${velocity}`);
        console.log(midiData);
      }
      if (this.player) {
        this.player.play(midiData);
      }
      return midiData;
    }
  
    /**
     * Set a callback function to receive MIDI messages
     * @param {Function} callback - Function to call with processed MIDI messages
     */
    setMessageCallback(callback) {
      if (typeof callback === 'function') {
        this.onMidiMessage = callback;
      } else {
        console.error('Invalid MIDI message callback');
      }
    }
  }

export class MIDIPlayer {
  constructor() {
    // Flag to track if Tone.js has been started
    this.initialized = false;
    
    // Create synths but don't initialize them yet
    this.createSynths();
  }

  /**
   * Create all synths and effects
   */
  createSynths() {
    // Initialize Tone.js synth
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    
    // Set default envelope
    this.synth.set({
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3
      },
      oscillator: {
        type: "triangle"
      }
    });
    
    // Keep track of active notes
    this.activeNotes = new Map();
    
    // Effects chain
    this.reverb = new Tone.Reverb({
      decay: 1.5,
      wet: 0.2
    }).toDestination();
    
    this.delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.2,
      wet: 0.1
    }).connect(this.reverb);
    
    // Connect synth to effects
    this.synth.connect(this.delay);
  }

  /**
   * Initialize Tone.js - must be called from a user action
   */
  async initialize() {
    if (!this.initialized) {
      try {
        await Tone.start();
        console.log("Tone.js audio context started");
        this.initialized = true;
        return true;
      } catch (error) {
        console.error("Could not start Tone.js audio context:", error);
        return false;
      }
    }
    return true;
  }

  /**
   * Play a MIDI message
   * @param {Object} midiData - Processed MIDI data
   */
  async play(midiData) {
    // Make sure Tone.js is initialized
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.warn("Cannot play MIDI - Tone.js not initialized");
        return;
      }
    }
    
    const { note, velocity, eventType } = midiData;
    
    // Use Tone.Midi to convert MIDI note number to note name
    const midiNote = new Tone.Midi(note);
    const noteName = midiNote.toNote();
    
    // Note on event with velocity > 0
    if (eventType === 9 && velocity > 0) {
      this.playNote(noteName, note, velocity);
    } 
    // Note off event or note on with velocity 0
    else if (eventType === 8 || (eventType === 9 && velocity === 0)) {
      this.releaseNote(noteName, note);
    }
  }

  /**
   * Play a note with the synthesizer
   * @param {string} noteName - Note name (e.g., "C4")
   * @param {number} midiNote - Original MIDI note number (for tracking)
   * @param {number} velocity - Note velocity (0-127)
   */
  playNote(noteName, midiNote, velocity) {
    // Calculate velocity (0-1 range)
    const normalizedVelocity = velocity / 127;
    
    // Play the note with Tone.js
    this.synth.triggerAttack(noteName, Tone.now(), normalizedVelocity);
    
    // Store the active note
    this.activeNotes.set(midiNote, noteName);
    
    // Log the note being played
    console.log(`Playing note: ${noteName} (MIDI: ${midiNote}) with velocity: ${normalizedVelocity}`);
  }

  /**
   * Release a note
   * @param {string} noteName - Note name (e.g., "C4")
   * @param {number} midiNote - Original MIDI note number (for tracking)
   */
  releaseNote(noteName, midiNote) {
    // Get the note name from our active notes map
    const activeNoteName = this.activeNotes.get(midiNote);
    
    // If we have this note active, release it
    if (activeNoteName) {
      this.synth.triggerRelease(activeNoteName, Tone.now());
      this.activeNotes.delete(midiNote);
      console.log(`Released note: ${activeNoteName} (MIDI: ${midiNote})`);
    }
  }

  /**
   * Update synth settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    if (settings.oscillator) {
      this.synth.set({
        oscillator: {
          type: settings.oscillator
        }
      });
    }
    
    if (settings.envelope) {
      this.synth.set({
        envelope: settings.envelope
      });
    }
    
    if (settings.effects) {
      if (settings.effects.reverb !== undefined) {
        this.reverb.wet.value = settings.effects.reverb;
      }
      
      if (settings.effects.delay !== undefined) {
        this.delay.wet.value = settings.effects.delay;
      }
    }
  }

  /**
   * Set the master volume
   * @param {number} value - Volume level (0-1)
   */
  setVolume(value) {
    if (value >= 0 && value <= 1) {
      Tone.getDestination().volume.value = Tone.gainToDb(value);
    }
  }
}