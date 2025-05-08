let defaultVoice = null;

function englishVoice() {
  const voices = window.speechSynthesis.getVoices().filter(
    (v) => {return v?.lang?.startsWith("en") &&
      !v.lang.includes('(') &&
      !v.lang.includes(')') &&
     !["Reed (English (United Kingdom))",
      "Flo (English (United Kingdom))"].includes(v.lang) 
    }
  );
  let voiceIndex = Math.floor(Math.random() * voices.length);
  let voice = voices[voiceIndex];
  return voice;
}

async function speak(text, voice, rate = 1, pitch = 1) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice != null ? voice : englishVoice();
  console.log({voice, u: utterance})

  utterance.rate = rate;
  utterance.pitch = pitch;
  console.log("speaking", {'text': utterance?.text, voice: utterance.voice?.name})
  window.speechSynthesis.speak(utterance);
}

// Get all available voices (call after voices are loaded)
speechSynthesis.onvoiceschanged = () => {
  const voices = window.speechSynthesis.getVoices();

  console.log(voices); // Check available voices in console

  defaultVoice = englishVoice();
};

  // Usage:
  // speak("Hello world", 0, 1.2, 1.1);

// this isn't really being used for anything, could revise it or just use speak directly (haven't gotten the queue to work yet/)
class Speaker {
    constructor(options = {}) {
        this.options = {
          checkDelay: 100, 
          ...options
        };
        this.isChecking = false;    
        this.checkNeeded = false;
        this.toSpeak = [];
    }

    async speak(text) {
        this.checkNeeded = true;
        console.log("calling speak", {text, toSpeak: this.toSpeak})
        this.toSpeak.push(text);
        
        // If not already checking, start the check process
        if (!this.isChecking) {
          this.processCheck();
        }
      }
  
      // Process spell checking
      processCheck() {
        if (!this.checkNeeded) {
          this.isChecking = false;
          return;
        }
        
        this.isChecking = true;
        this.checkNeeded = false;

        // let next = this.toSpeak.pop();
        let next = this.toSpeak.pop();
        console.log({speak: this.toSpeak})
        if (next) {
            // Perform the check
            speak(next).then(() => {
              // Check if another check is needed when this one is done
              requestAnimationFrame(() => this.processCheck());
            });
        }
      }
}
