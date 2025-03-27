function speak(text, voiceIndex = 0, rate = 1, pitch = 1) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices[voiceIndex];
    utterance.rate = rate;
    utterance.pitch = pitch;
    console.log("speaking", {utterance, voice: utterance.voice})
    window.speechSynthesis.speak(utterance);
  }
  
  // Get all available voices (call after voices are loaded)
  speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    // console.log(voices); // Check available voices in console
  };
  
  // Usage:
//   speak("Hello world", 0, 1.2, 1.1);